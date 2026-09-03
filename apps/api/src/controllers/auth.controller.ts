import type { Request, Response } from 'express';
import { z } from 'zod';
import { revokeToken } from '../auth/tokenDenylist';
import { hashPassword } from '../auth/password';
import { signAccessToken } from '../auth/jwt';
import { accountTypeToRole } from '../auth/roles';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import {
    uniqueViolationDetails,
    uniqueViolationFields,
} from '../lib/prismaErrors';
import {
    assertCompanyIdentityAvailable,
    checkCompanyIdentityAvailability,
} from '../lib/companyIdentity';
import { companyProfileSelect, toCompanyProfile } from '../lib/companyProfile';
import { parseBody } from '../middleware/validate';
import { REGISTER_UNIQUE_FIELDS, registerSchema } from '../schemas/auth.schema';

// US1-1. Creates the company, its industry tags, and the provider/receiver row
// its account type implies — one nested create, so one transaction. Returns a
// token as well as the company, which is why this response wraps.
export async function register(req: Request, res: Response): Promise<void> {
    const body = parseBody(registerSchema, req.body);
    const { company_type, account_type, password, ...rest } = body;

    // Reports both collisions at once; an index only fails on the first.
    await assertCompanyIdentityAvailable({
        username: rest.username,
        email: rest.email,
    });

    // A BOTH company gets both rows, exactly as the seeded companies have them.
    const isProvider = account_type === 'PROVIDER' || account_type === 'BOTH';
    const isReceiver = account_type === 'RECEIVER' || account_type === 'BOTH';

    let company;
    try {
        company = await prisma.company.create({
            data: {
                ...rest,
                // exactOptionalPropertyTypes: a missing optional is undefined
                // here, but a nullable column wants null.
                company_description: rest.company_description ?? null,
                address: rest.address ?? null,
                website: rest.website ?? null,
                account_type,
                password: await hashPassword(password),
                company_type: {
                    create: company_type.map((tag) => ({ company_type: tag })),
                },
                ...(isProvider ? { provider: { create: {} } } : {}),
                ...(isReceiver ? { receiver: { create: {} } } : {}),
            },
            select: companyProfileSelect,
        });
    } catch (err) {
        // Two registrations can clear the check and race to here; the indexes
        // are what actually enforce uniqueness.
        const fields = uniqueViolationFields(err, REGISTER_UNIQUE_FIELDS);
        if (fields) {
            throw ApiError.conflict(
                'Username or email already registered',
                uniqueViolationDetails(fields),
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

const checkAvailabilitySchema = z.object({
    username: z.string().trim().min(1).max(50),
    email: z.email().max(100),
});

// US 1-1.9 checking uniqueness of username and email
export async function checkAvailability(
    req: Request,
    res: Response,
): Promise<void> {
    const body = parseBody(checkAvailabilitySchema, req.body);
    const availability = await checkCompanyIdentityAvailability(body);

    res.json(availability);
}

// US1-3. requireAuth runs first, so a second logout with the same token 401s.
export function logout(req: Request, res: Response): void {
    revokeToken(req.auth!.jti, req.auth!.exp);
    res.status(204).end();
}
