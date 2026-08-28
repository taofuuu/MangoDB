import type { NextFunction, Request, Response } from 'express';
import type { AuthTokenClaims, UserRole } from '@mangodb/shared';
import { verifyAccessToken } from '../auth/jwt';
import { isTokenRevoked } from '../auth/tokenDenylist';

const BEARER_PREFIX = 'Bearer ';

// Rejects the request unless it carries a valid access token, then exposes
// the token claims on req.auth for downstream handlers.
export function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    const header = req.headers.authorization;
    if (!header?.startsWith(BEARER_PREFIX)) {
        res.status(401).json({
            error: 'Missing or malformed Authorization header',
        });
        return;
    }

    let claims: AuthTokenClaims;
    try {
        claims = verifyAccessToken(header.slice(BEARER_PREFIX.length).trim());
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }

    // Signature and expiry are fine, but the session was ended by logout.
    if (isTokenRevoked(claims.jti)) {
        res.status(401).json({ error: 'Session has ended' });
        return;
    }

    req.auth = claims;
    // Outside the try: a handler error further down the chain is not an
    // authentication failure and must not be reported as one.
    next();
}

// Use after requireAuth: requireAuth, requireRole('admin')
export function requireRole(...allowed: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.auth) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        if (!allowed.includes(req.auth.role)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }
        next();
    };
}
