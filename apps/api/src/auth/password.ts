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
