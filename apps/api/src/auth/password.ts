import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

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
        throw new Error('Password must not be empty');
    }
    return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
    if (!plain || !hash) {
        return Promise.resolve(false);
    }
    return bcrypt.compare(plain, hash);
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
