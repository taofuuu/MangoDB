import type { NextFunction, Request, Response } from 'express';
import type { AuthTokenClaims, UserRole } from '@mangodb/shared';
import { verifyAccessToken } from '../auth/jwt';
import { isTokenRevoked } from '../auth/tokenDenylist';
import { ApiError } from '../lib/ApiError';
import { isCompanyDeleted } from '../lib/accountDeletion';
import { roleGrants } from '../auth/roles';

const BEARER_PREFIX = 'Bearer ';

// Extracts the raw JWT from either the Authorization header or the httpOnly
// access_token cookie. Returns null if neither is present.
function extractToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (header?.startsWith(BEARER_PREFIX)) {
        return header.slice(BEARER_PREFIX.length).trim();
    }
    if (req.cookies?.access_token) {
        return req.cookies.access_token as string;
    }
    return null;
}

// Verifies the bearer token and exposes its claims on req.auth. Failures go to
// next() so they leave through errorHandler in the standard envelope.
export async function requireAuth(
    req: Request,
    _res: Response,
    next: NextFunction,
): Promise<void> {
    const token = extractToken(req);
    if (!token) {
        next(
            ApiError.unauthorized('Missing or malformed Authorization header'),
        );
        return;
    }

    let claims: AuthTokenClaims;
    try {
        claims = verifyAccessToken(token);
    } catch {
        next(ApiError.unauthorized('Invalid or expired token'));
        return;
    }

    // Outside the try above: a database error is not an auth failure.
    if (await isTokenRevoked(claims.jti)) {
        next(ApiError.unauthorized('Session has ended'));
        return;
    }

    // US1-6 / US6-4. A token issued before deletion stays cryptographically
    // valid until it expires, and there is no per-company list of outstanding
    // jtis to revoke individually — so every authenticated request re-checks
    // the account itself. Same message as a revoked token: this is not the
    // caller's business to distinguish from a plain logout.
    if (await isCompanyDeleted(Number(claims.sub))) {
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
