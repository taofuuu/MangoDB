import { prisma } from './prisma';

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

    const matches = await prisma.company.findMany({
        where: {
            OR: [
                { username: { equals: username, mode: 'insensitive' } },
                { email: { equals: email, mode: 'insensitive' } },
            ],
        },
        select: { username: true, email: true },
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
