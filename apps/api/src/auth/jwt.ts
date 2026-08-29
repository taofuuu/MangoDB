import { randomUUID } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type {
    AuthTokenClaims,
    AuthTokenPayload,
    UserRole,
} from '@mangodb/shared';

const DEFAULT_EXPIRES_IN = '1h';

// Keep in sync with the UserRole union in @mangodb/shared. Typing the array as
// readonly UserRole[] catches stray values here, but adding a role to the union
// without adding it below only shows up as a rejected token.
const USER_ROLES: readonly UserRole[] = ['provider', 'receiver', 'admin'];

function isUserRole(value: unknown): value is UserRole {
    return USER_ROLES.includes(value as UserRole);
}

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

// Every token gets a unique jti so logout can revoke one session without
// invalidating the account's other tokens.
export function signAccessToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, getSecret(), {
        expiresIn: getExpiresIn(),
        jwtid: randomUUID(),
    });
}

// Throws if the token is malformed, tampered with, or expired.
export function verifyAccessToken(token: string): AuthTokenClaims {
    const decoded = jwt.verify(token, getSecret());
    if (
        typeof decoded === 'string' ||
        typeof decoded.sub !== 'string' ||
        !isUserRole(decoded.role) ||
        typeof decoded.jti !== 'string' ||
        typeof decoded.exp !== 'number'
    ) {
        throw new jwt.JsonWebTokenError(
            'Token payload is missing required claims',
        );
    }
    return {
        sub: decoded.sub,
        role: decoded.role,
        jti: decoded.jti,
        exp: decoded.exp,
    };
}
