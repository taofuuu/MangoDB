import { Prisma } from '../generated/prisma/client';
import { ApiError } from './ApiError';
import { prisma } from './prisma';
import { uniqueViolationDetails } from './prismaErrors';

export interface CompanyIdentityInput {
    username: string;
    email: string;
}

// An edit (US1-5) may change only one of the two, or neither.
export interface PartialCompanyIdentityInput {
    username?: string | undefined;
    email?: string | undefined;
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

interface IdentityMatch {
    username: string;
    email: string;
}

// One case-insensitive query for whichever fields were supplied. excludeCompanyId
// is the caller's own row: keeping your own email is not a collision with
// yourself. Nothing supplied matches nothing, rather than every company.
async function findIdentityMatches(
    username: string | undefined,
    email: string | undefined,
    excludeCompanyId: number | undefined,
): Promise<IdentityMatch[]> {
    const wanted: Prisma.Sql[] = [];
    if (username) wanted.push(Prisma.sql`lower(username) = ${username}`);
    if (email) wanted.push(Prisma.sql`lower(email) = ${email}`);

    if (wanted.length === 0) return [];

    const excludeSelf =
        excludeCompanyId === undefined
            ? Prisma.empty
            : Prisma.sql`AND company_id <> ${excludeCompanyId}`;

    return prisma.$queryRaw<IdentityMatch[]>`
    SELECT username, email FROM company
    WHERE (${Prisma.join(wanted, ' OR ')}) ${excludeSelf}`;
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

    const matches = await findIdentityMatches(username, email, undefined);

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

// US1-1 and US1-5. Throwing form, for callers that stop rather than report.
// Same details as register()'s P2002 backstop, so the caller cannot tell which
// rejected it. Pass excludeCompanyId when editing, or a company re-submitting
// its own username would collide with itself.
export async function assertCompanyIdentityAvailable(
    input: PartialCompanyIdentityInput,
    excludeCompanyId?: number,
): Promise<void> {
    const username = input.username && normalizeUsername(input.username);
    const email = input.email && normalizeEmail(input.email);

    const matches = await findIdentityMatches(
        username,
        email,
        excludeCompanyId,
    );

    // A field that was not supplied is never reported as taken.
    const taken: string[] = [];
    if (
        username &&
        matches.some(
            (company) => normalizeUsername(company.username) === username,
        )
    ) {
        taken.push('username');
    }
    if (
        email &&
        matches.some((company) => normalizeEmail(company.email) === email)
    ) {
        taken.push('email');
    }

    if (taken.length > 0) {
        throw ApiError.conflict(
            'Username or email already registered',
            uniqueViolationDetails(taken),
        );
    }
}
