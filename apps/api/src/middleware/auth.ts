import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@mangodb/shared';
import { verifyAccessToken } from '../auth/jwt';

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

    try {
        req.auth = verifyAccessToken(header.slice(BEARER_PREFIX.length).trim());
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
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
