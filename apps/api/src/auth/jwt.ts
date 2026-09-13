import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type {
    AuthTokenClaims,
    AuthTokenPayload,
    UserRole,
} from '@mangodb/shared';
import { JWT_SECRET, SESSION_TTL_SECONDS } from '../env';

// Keep in sync with the UserRole union in @mangodb/shared. Typing the array as
// readonly UserRole[] catches stray values here, but adding a role to the union
// without adding it below only shows up as a rejected token.
const USER_ROLES: readonly UserRole[] = [
    'provider',
    'receiver',
    'both',
    'admin',
];

function isUserRole(value: unknown): value is UserRole {
    return USER_ROLES.includes(value as UserRole);
}

// Every token gets a unique jti so logout can revoke one session without
// invalidating the account's other tokens.
export function signAccessToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: SESSION_TTL_SECONDS,
        jwtid: randomUUID(),
    });
}

// Throws if the token is malformed, tampered with, or expired.
export function verifyAccessToken(token: string): AuthTokenClaims {
    const decoded = jwt.verify(token, JWT_SECRET);
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
