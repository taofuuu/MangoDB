import type { Request, Response } from 'express';
import type { CompanyProfile } from '@mangodb/shared';
import { z } from 'zod';
import { revokeToken } from '../auth/tokenDenylist';
import {
    dummyPasswordHash,
    hashPassword,
    verifyPassword,
} from '../auth/password';
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
import { sendSession } from '../lib/session';
import { parseBody } from '../middleware/validate';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import { COMPANY_UNIQUE_FIELDS } from '../schemas/company.schema';

// Both login endpoints ask the same question, so they share the answer — and
// share the defence. Both failures must look identical: same status, same body,
// same time. bcrypt.compare is slow by design, so short-circuiting on a missing
// row answered ~7x faster than a wrong password did, and that gap alone told an
// attacker which emails were registered. Comparing against a throwaway hash on
// the miss path makes every attempt pay the same cost.
async function verifyCredentials(
    email: string,
    password: string,
): Promise<CompanyProfile> {
    // companyProfileSelect leaves password out on purpose, but verifying needs
    // the stored hash. Ask for it alongside and drop it before returning —
    // one round trip instead of a second lookup. deletedAt rides along the
    // same way, for the login-blocking check below.
    const company = await prisma.company.findUnique({
        where: { email },
        select: { ...companyProfileSelect, password: true, deletedAt: true },
    });

    const storedHash = company?.password ?? (await dummyPasswordHash());
    const passwordMatches = await verifyPassword(password, storedHash);

    // US1-6 / US6-4. A deleted account fails the same way a wrong password
    // does: same message, same status, and — because verifyPassword above
    // always ran against this row's real stored hash — the same timing. A
    // distinct "this account was deleted" response would hand a prober a way
    // to enumerate deleted accounts that a wrong-password response does not.
    if (!company || company.deletedAt || !passwordMatches) {
        throw ApiError.unauthorized('Invalid email or password');
    }

    // The hash never leaves this function: split it off, return the rest.
    const { password: _hash, deletedAt: _deletedAt, ...row } = company;

    return toCompanyProfile(row);
}

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
                companyName: rest.company_name,
                username: rest.username,
                email: rest.email,
                phone: rest.phone,
                // exactOptionalPropertyTypes: a missing optional is undefined
                // here, but a nullable column wants null.
                companyDescription: rest.company_description ?? null,
                address: rest.address ?? null,
                website: rest.website ?? null,
                accountType: account_type,
                password: await hashPassword(password),
                companyType: {
                    create: company_type.map((tag) => ({ companyType: tag })),
                },
                ...(isProvider ? { provider: { create: {} } } : {}),
                ...(isReceiver ? { receiver: { create: {} } } : {}),
            },
            select: companyProfileSelect,
        });
    } catch (err) {
        // Two registrations can clear the check and race to here; the indexes
        // are what actually enforce uniqueness.
        const fields = uniqueViolationFields(err, COMPANY_UNIQUE_FIELDS);
        if (fields) {
            throw ApiError.conflict(
                'Username or email already registered',
                uniqueViolationDetails(fields),
            );
        }
        throw err;
    }

    sendSession(res, toCompanyProfile(company), 201);
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
export async function logout(req: Request, res: Response): Promise<void> {
    await revokeToken(req.auth!.jti, req.auth!.exp);
    res.clearCookie('access_token');
    res.status(204).end();
}

// US1-2. The mirror of register: it also logs you in, so it returns the same
// { company, accessToken } pair rather than a bare resource. 200, not 201 —
// login creates nothing.
export async function login(req: Request, res: Response): Promise<void> {
    const { email, password } = parseBody(loginSchema, req.body);
    const company = await verifyCredentials(email, password);

    // The mirror of the check in adminLogin. An admin signing in here would
    // get a working token and land on the company dashboard, reading its own
    // row as if it were a company — so send it to the door built for it.
    // 403, not 401: the password checked out, so we know who this is.
    if (accountTypeToRole(company.account_type) === 'admin') {
        throw ApiError.forbidden(
            'Administrators must use the administrator login',
        );
    }

    sendSession(res, company);
}

// US6-1. The admin half of login. Same credentials, same session, same cookie —
// the only difference is which accounts it turns away, so each login page can
// say which of the two things went wrong.
export async function adminLogin(req: Request, res: Response): Promise<void> {
    const { email, password } = parseBody(loginSchema, req.body);
    const company = await verifyCredentials(email, password);

    if (accountTypeToRole(company.account_type) !== 'admin') {
        throw ApiError.forbidden('This is not an administrator account');
    }

    sendSession(res, company);
}
