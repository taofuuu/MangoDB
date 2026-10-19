import type { Request, Response } from 'express';
import { revokeToken } from '../auth/tokenDenylist';
import { hashPassword, verifyCredentials } from '../auth/password';
import {
    accountTypeToRole,
    ownsProviderRow,
    ownsReceiverRow,
} from '../auth/roles';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/api-error';
import {
    assertCompanyIdentityAvailable,
    checkCompanyIdentityAvailability,
    identityConflict,
} from '../lib/company-identity';
import { companyProfileSelect, toCompanyProfile } from '../lib/company-profile';
import { sendSession } from '../lib/session';
import { parseBody } from '../middleware/validate';
import {
    checkAvailabilitySchema,
    loginSchema,
    registerSchema,
} from '../schemas/auth.schema';

// US1-1. Creates the company, its industry tags, and the provider/receiver row
// its account type implies — one nested create, so one transaction. Returns a
// token as well as the company, which is why this response wraps.
export async function register(req: Request, res: Response): Promise<void> {
    const body = parseBody(registerSchema, req.body);
    // tosAccepted is pulled out so it is not spread into the row: what gets
    // stored is when, not the flag. The schema only lets true through.
    const {
        companyType,
        accountType,
        password,
        tosAccepted: _tosAccepted,
        ...rest
    } = body;

    // Reports both collisions at once; an index only fails on the first.
    await assertCompanyIdentityAvailable({
        username: rest.username,
        email: rest.email,
    });

    // A BOTH company gets both rows, exactly as the seeded companies have them.
    const isProvider = ownsProviderRow(accountType);
    const isReceiver = ownsReceiverRow(accountType);

    let company;
    try {
        company = await prisma.company.create({
            data: {
                ...rest,
                // exactOptionalPropertyTypes: a missing optional is undefined
                // here, but a nullable column wants null.
                companyDescription: rest.companyDescription ?? null,
                address: rest.address ?? null,
                website: rest.website ?? null,
                accountType,
                password: await hashPassword(password),
                // Set here, inside the same create as the company, so a
                // registration that fails stores no consent either.
                tosAcceptedAt: new Date(),
                companyType: {
                    create: companyType.map((tag) => ({ companyType: tag })),
                },
                ...(isProvider ? { provider: { create: {} } } : {}),
                ...(isReceiver ? { receiver: { create: {} } } : {}),
            },
            select: companyProfileSelect,
        });
    } catch (err) {
        // Two registrations can clear the check and race to here.
        throw identityConflict(err) ?? err;
    }

    sendSession(res, toCompanyProfile(company), 201);
}

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
    if (accountTypeToRole(company.accountType) === 'admin') {
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

    if (accountTypeToRole(company.accountType) !== 'admin') {
        throw ApiError.forbidden('This is not an administrator account');
    }

    sendSession(res, company);
}
