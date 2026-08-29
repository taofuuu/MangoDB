import type { Request, Response } from 'express';
import { z } from 'zod';
import type { AccountType, CompanyProfile } from '@mangodb/shared';
import { revokeToken } from '../auth/tokenDenylist';
import { hashPassword } from '../auth/password';
import { signAccessToken } from '../auth/jwt';
import { accountTypeToRole } from '../auth/roles';
import { prisma } from '../lib/prisma';
import { ApiError, type ApiErrorDetail } from '../lib/ApiError';
import { parseBody } from '../middleware/validate';

// US1-3. requireAuth runs first, so a second logout with the same token 401s.
export function logout(req: Request, res: Response): void {
    revokeToken(req.auth!.jti, req.auth!.exp);
    res.status(204).end();
}

// Placeholder until US1-4 lands the real company profile lookup.
export function getCurrentUser(req: Request, res: Response): void {
    res.json({ id: req.auth!.sub, role: req.auth!.role });
}

// Sizes match the columns in prisma/schema.prisma; anything longer would be a
// database error rather than a validation message.
const registerSchema = z.object({
    company_name: z.string().trim().min(1).max(255),
    // Lowercased because the unique index is case-sensitive: without this,
    // "CodeCrafters" would register alongside "codecrafters".
    username: z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(50)
        .regex(/^[a-z0-9_]+$/, 'Use letters, numbers, and underscores only'),
    email: z.email().max(100).toLowerCase(),
    // bcrypt ignores everything past 72 bytes, so accepting more is a lie.
    password: z.string().min(8).max(72),
    phone: z
        .string()
        .trim()
        .min(6)
        .max(20)
        .regex(/^[0-9+\-\s()]+$/, 'Use digits and + - ( ) only'),
    account_type: z.enum(['PROVIDER', 'RECEIVER', 'BOTH']),
    // Industry tags — SME, Software House, FinTech. Every seeded company has
    // at least one, so registration requires one too.
    company_type: z.array(z.string().trim().min(1).max(100)).min(1).max(10),
    company_description: z.string().trim().max(2000).optional(),
    address: z.string().trim().max(500).optional(),
    website: z.url().max(255).optional(),
});

// account_type is a plain VarChar in the schema, so Prisma hands it back as a
// string; the enum in registerSchema is what makes narrowing it safe.
type CompanyRow = Omit<CompanyProfile, 'account_type' | 'company_type'> & {
    account_type: string;
    company_type: { company_type: string }[];
};

function toCompanyProfile(company: CompanyRow): CompanyProfile {
    return {
        ...company,
        account_type: company.account_type as AccountType,
        company_type: company.company_type.map((tag) => tag.company_type),
    };
}

// TEMPORARY. The unique indexes on username and email are the only duplicate
// check right now, so a losing insert arrives here as Prisma's P2002. Replace
// this with assertCompanyIdentityAvailable from Fang's company-uniqueness.ts
// once feature/username-email-uniqueness is rebased onto the current main.
//
// Duck-typed rather than instanceof: the prisma-client generator does not
// export the error class from the classic @prisma/client path.
function uniqueViolationFields(err: unknown): ApiErrorDetail[] | null {
    if (typeof err !== 'object' || err === null) {
        return null;
    }
    const candidate = err as {
        code?: unknown;
        meta?: {
            target?: unknown;
            driverAdapterError?: {
                cause?: { constraint?: { index?: unknown; fields?: unknown } };
            };
        };
    };
    if (candidate.code !== 'P2002') {
        return null;
    }

    // Through the driver adapter the offending columns arrive as the index name
    // (company_username_key), not as meta.target — that is the plain-engine
    // shape, kept here so this still works if the adapter is dropped.
    const constraint = candidate.meta?.driverAdapterError?.cause?.constraint;
    const index = constraint?.index;
    const fields = [
        ...toStringArray(candidate.meta?.target),
        ...toStringArray(constraint?.fields),
        ...(typeof index === 'string'
            ? [index.replace(/^company_/, '').replace(/_key$/, '')]
            : []),
    ].filter((field) => field in registerSchema.shape);

    if (fields.length === 0) {
        return [{ field: '(body)', message: 'Already registered' }];
    }
    return fields.map((field) => ({
        field,
        message: `This ${field} is already registered`,
    }));
}

function toStringArray(value: unknown): string[] {
    if (typeof value === 'string') {
        return [value];
    }
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];
}

// US1-1. Creates the company, its industry tags, and the provider/receiver row
// its account type implies — one nested create, so one transaction. Returns a
// token as well as the company, which is why this response wraps.
export async function register(req: Request, res: Response): Promise<void> {
    const body = parseBody(registerSchema, req.body);
    const { company_type, account_type, password, ...rest } = body;

    // exactOptionalPropertyTypes: a missing optional is undefined here, but a
    // nullable column wants null.
    const optional = {
        company_description: rest.company_description ?? null,
        address: rest.address ?? null,
        website: rest.website ?? null,
    };

    // A BOTH company gets both rows, exactly as the seeded companies have them.
    const isProvider = account_type === 'PROVIDER' || account_type === 'BOTH';
    const isReceiver = account_type === 'RECEIVER' || account_type === 'BOTH';

    let company;
    try {
        company = await prisma.company.create({
            data: {
                ...rest,
                ...optional,
                account_type,
                password: await hashPassword(password),
                company_type: {
                    create: company_type.map((tag) => ({ company_type: tag })),
                },
                ...(isProvider ? { provider: { create: {} } } : {}),
                ...(isReceiver ? { receiver: { create: {} } } : {}),
            },
            // Selected explicitly so the password hash cannot leave by accident.
            select: {
                company_id: true,
                company_name: true,
                company_description: true,
                username: true,
                email: true,
                phone: true,
                address: true,
                website: true,
                account_type: true,
                company_type: { select: { company_type: true } },
            },
        });
    } catch (err) {
        const details = uniqueViolationFields(err);
        if (details) {
            throw ApiError.conflict(
                'Username or email already registered',
                details,
            );
        }
        throw err;
    }

    // sub is a string in AuthTokenPayload; company_id is an int.
    const accessToken = signAccessToken({
        sub: String(company.company_id),
        role: accountTypeToRole(account_type),
    });

    res.status(201).json({
        company: toCompanyProfile(company),
        accessToken,
    });
}
