import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { CompanyProfile } from '@mangodb/shared';
import { ApiError } from '../lib/api-error';
import { prisma } from '../lib/prisma';
import { companyProfileSelect, toCompanyProfile } from '../lib/company-profile';

// Cost factor. Raising this slows every login, so change it deliberately.
const SALT_ROUNDS = 12;

// bcrypt reads only the first 72 bytes of a password and ignores the rest, so
// the cap has to be counted in bytes. Zod's `.max()` counts characters instead —
// the same thing in ASCII, but a Thai character is 3 bytes, so a 30-character
// Thai password is 90 bytes and everything past the 24th character would be
// dropped silently, letting two different passwords open one account.
export const BCRYPT_MAX_BYTES = 72;

export function fitsBcryptLimit(password: string): boolean {
    return Buffer.byteLength(password, 'utf8') <= BCRYPT_MAX_BYTES;
}

export function hashPassword(plain: string): Promise<string> {
    if (!plain) {
        throw ApiError.badRequest('Password must not be empty');
    }
    return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
    if (!plain || !hash) {
        return Promise.resolve(false);
    }
    return bcrypt.compare(plain, hash);
}

// Re-authentication: a caller with a valid token proving it still knows the
// password, before changing a credential or deleting an account. Both callers
// ask about their own row, so there is no account to enumerate by timing this
// and no dummy-hash dance is needed — unlike login's verifyCredentials.
//
// A missing row is the same answer as a wrong password. A token outlives the
// company it names, so "deleted mid-session" reaches here, and it is not the
// caller's business which of the two happened.
export async function assertCurrentPassword(
    companyId: number,
    currentPassword: string,
): Promise<void> {
    // companyProfileSelect leaves the hash out on purpose, and this needs it:
    // ask for it on its own, and never let it past this function.
    const company = await prisma.company.findUnique({
        where: { companyId },
        select: { password: true },
    });

    if (
        !company ||
        !(await verifyPassword(currentPassword, company.password))
    ) {
        throw ApiError.unauthorized('Current password is incorrect');
    }
}

// Something for a failed lookup to compare against, so verifying costs the
// same whether or not the account exists. The input is a random UUID: nobody
// can supply a password that matches it, so this never authenticates anyone.
// Hashed on first use rather than at import so it always tracks SALT_ROUNDS
// and the cost is paid once, not on every miss.
let dummyHash: Promise<string> | undefined;

export function dummyPasswordHash(): Promise<string> {
    dummyHash ??= bcrypt.hash(randomUUID(), SALT_ROUNDS);
    return dummyHash;
}

// Both login endpoints ask the same question, so they share the answer — and
// share the defence. Both failures must look identical: same status, same body,
// same time. bcrypt.compare is slow by design, so short-circuiting on a missing
// row answered ~7x faster than a wrong password did, and that gap alone told an
// attacker which emails were registered. Comparing against a throwaway hash on
// the miss path makes every attempt pay the same cost.
export async function verifyCredentials(
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
