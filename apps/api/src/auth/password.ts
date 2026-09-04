import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

// Cost factor. Raising this slows every login, so change it deliberately.
const SALT_ROUNDS = 12;

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
