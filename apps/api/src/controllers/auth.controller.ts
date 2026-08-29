import type { Request, Response } from 'express';
import { revokeToken } from '../auth/tokenDenylist';

// US1-3. requireAuth runs first, so a second logout with the same token 401s.
export function logout(req: Request, res: Response): void {
    revokeToken(req.auth!.jti, req.auth!.exp);
    res.status(204).end();
}

// Placeholder until US1-4 lands the real company profile lookup.
export function getCurrentUser(req: Request, res: Response): void {
    res.json({ id: req.auth!.sub, role: req.auth!.role });
}
