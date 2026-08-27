import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AuthTokenPayload } from '@mangodb/shared';

const DEFAULT_EXPIRES_IN = '1h';

// Read lazily: imports are evaluated before dotenv.config() runs in index.ts.
function getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not set');
    }
    return secret;
}

type ExpiresIn = NonNullable<SignOptions['expiresIn']>;

function getExpiresIn(): ExpiresIn {
    return (process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN) as ExpiresIn;
}

export function signAccessToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, getSecret(), { expiresIn: getExpiresIn() });
}

// Throws if the token is malformed, tampered with, or expired.
export function verifyAccessToken(token: string): AuthTokenPayload {
    const decoded = jwt.verify(token, getSecret());
    if (
        typeof decoded === 'string' ||
        typeof decoded.sub !== 'string' ||
        !decoded.role
    ) {
        throw new jwt.JsonWebTokenError(
            'Token payload is missing required claims',
        );
    }
    return { sub: decoded.sub, role: decoded.role };
}
