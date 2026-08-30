import { ApiError } from './ApiError';
import { prisma } from './prisma';
import { uniqueViolationDetails } from './prismaErrors';

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

export function normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
}

export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

// T009. Checks username and email together with one case-insensitive query.
export async function checkCompanyIdentityAvailability(
    input: CompanyIdentityInput,
): Promise<CompanyIdentityAvailability> {
    const username = normalizeUsername(input.username);
    const email = normalizeEmail(input.email);

    if (!username || !email) {
        throw new TypeError('Username and email must not be empty');
    }

    const matches = await prisma.$queryRaw<
        { username: string; email: string }[]
    >`
    SELECT username, email FROM company
    WHERE lower(username) = ${username} OR lower(email) = ${email}`;

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

// US1-1. Throwing form, for callers that stop rather than report. Same details
// as register()'s P2002 backstop, so the caller cannot tell which rejected it.
export async function assertCompanyIdentityAvailable(
    input: CompanyIdentityInput,
): Promise<void> {
    const availability = await checkCompanyIdentityAvailability(input);

    const taken: string[] = [];
    if (!availability.usernameAvailable) taken.push('username');
    if (!availability.emailAvailable) taken.push('email');

    if (taken.length > 0) {
        throw ApiError.conflict(
            'Username or email already registered',
            uniqueViolationDetails(taken),
        );
    }
}
