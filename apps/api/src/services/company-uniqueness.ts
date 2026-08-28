import { prisma } from '../lib/prisma';

export interface CompanyIdentityInput {
    username: string;
    email: string;
}

export interface CompanyIdentityAvailability {
    username: string;
    email: string;
    usernameAvailable: boolean;
    emailAvailable: boolean;
}

export type CompanyIdentityField = 'username' | 'email';

export class CompanyIdentityConflictError extends Error {
    readonly statusCode = 409;

    constructor(readonly fields: readonly CompanyIdentityField[]) {
        super(`${fields.join(' and ')} already in use`);
        this.name = 'CompanyIdentityConflictError';
    }
}

export function normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
}

export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

/**
 * T009: Check whether a username and email are available for registration.
 *
 * Matching is case-insensitive. T008 should save the returned normalized
 * username and email so the database UNIQUE constraints remain the final
 * protection against two simultaneous registrations.
 */
export async function checkCompanyIdentityAvailability(
    input: CompanyIdentityInput,
): Promise<CompanyIdentityAvailability> {
    const username = normalizeUsername(input.username);
    const email = normalizeEmail(input.email);

    if (!username) {
        throw new TypeError('Username must not be empty');
    }
    if (!email) {
        throw new TypeError('Email must not be empty');
    }

    const matches = await prisma.company.findMany({
        where: {
            OR: [
                {
                    username: {
                        equals: username,
                        mode: 'insensitive',
                    },
                },
                {
                    email: {
                        equals: email,
                        mode: 'insensitive',
                    },
                },
            ],
        },
        select: {
            username: true,
            email: true,
        },
    });

    const usernameTaken = matches.some(
        (company) => normalizeUsername(company.username) === username,
    );
    const emailTaken = matches.some(
        (company) => normalizeEmail(company.email) === email,
    );

    return {
        username,
        email,
        usernameAvailable: !usernameTaken,
        emailAvailable: !emailTaken,
    };
}

/**
 * Use this from T008 before creating the company. A route can map this error
 * to HTTP 409 Conflict and return `error.fields` to the frontend.
 */
export async function assertCompanyIdentityAvailable(
    input: CompanyIdentityInput,
): Promise<{ username: string; email: string }> {
    const availability = await checkCompanyIdentityAvailability(input);
    const conflicts: CompanyIdentityField[] = [];

    if (!availability.usernameAvailable) {
        conflicts.push('username');
    }
    if (!availability.emailAvailable) {
        conflicts.push('email');
    }

    if (conflicts.length > 0) {
        throw new CompanyIdentityConflictError(conflicts);
    }

    return {
        username: availability.username,
        email: availability.email,
    };
}

/**
 * Converts Prisma's P2002 unique-constraint error into the same conflict used
 * by the pre-check. T008 should call this in its create-operation catch block
 * because a pre-check alone cannot prevent a registration race condition.
 */
export function identityConflictFromDatabaseError(
    error: unknown,
): CompanyIdentityConflictError | null {
    if (!isRecord(error) || error.code !== 'P2002') {
        return null;
    }

    const target = isRecord(error.meta) ? error.meta.target : undefined;
    const targetText = Array.isArray(target)
        ? target.join(' ').toLowerCase()
        : typeof target === 'string'
          ? target.toLowerCase()
          : '';
    const conflicts: CompanyIdentityField[] = [];

    if (targetText.includes('username')) {
        conflicts.push('username');
    }
    if (targetText.includes('email')) {
        conflicts.push('email');
    }

    return new CompanyIdentityConflictError(
        conflicts.length > 0 ? conflicts : ['username', 'email'],
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}
