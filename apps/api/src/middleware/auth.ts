import type { NextFunction, Request, Response } from 'express';
import type { AuthTokenClaims, UserRole } from '@mangodb/shared';
import { verifyAccessToken } from '../auth/jwt';
import { isTokenRevoked } from '../auth/tokenDenylist';
import { ApiError } from '../lib/ApiError';
import { roleGrants } from '../auth/roles';

const BEARER_PREFIX = 'Bearer ';

// Verifies the bearer token and exposes its claims on req.auth. Failures go to
// next() so they leave through errorHandler in the standard envelope.
export function requireAuth(
    req: Request,
    _res: Response,
    next: NextFunction,
): void {
    const header = req.headers.authorization;
    if (!header?.startsWith(BEARER_PREFIX)) {
        next(
            ApiError.unauthorized('Missing or malformed Authorization header'),
        );
        return;
    }

    let claims: AuthTokenClaims;
    try {
        claims = verifyAccessToken(header.slice(BEARER_PREFIX.length).trim());
    } catch {
        next(ApiError.unauthorized('Invalid or expired token'));
        return;
    }

    // Signature and expiry are fine, but the session was ended by logout.
    if (isTokenRevoked(claims.jti)) {
        next(ApiError.unauthorized('Session has ended'));
        return;
    }

    req.auth = claims;
    // Outside the try: a handler error further down the chain is not an
    // authentication failure and must not be reported as one.
    next();
}

// Use after requireAuth: requireAuth, requireRole('admin')
export function requireRole(...allowed: UserRole[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.auth) {
            next(ApiError.unauthorized());
            return;
        }
        // Compare what the role grants, not the role itself: a BOTH company
        // passes requireRole('provider') and requireRole('receiver').
        const grants = roleGrants(req.auth.role);
        if (!allowed.some((role) => grants.includes(role))) {
            next(ApiError.forbidden());
            return;
        }
        next();
    };
}
