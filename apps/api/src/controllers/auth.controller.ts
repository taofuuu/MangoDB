import type { Request, Response } from 'express';
import { z } from 'zod';
import { revokeToken } from '../auth/tokenDenylist';
import { checkCompanyIdentityAvailability } from '../lib/companyIdentity';
import { parseBody } from '../middleware/validate';

const checkAvailabilitySchema = z.object({
    username: z.string().trim().min(1).max(50),
    email: z.string().trim().max(100),
});

// US 1-1.9 checking uniqueness of username and email
export async function checkAvailability(
    req: Request,
    res: Response,
): Promise<void> {
    const body = parseBody(checkAvailabilitySchema, req.body);
    const availability = await checkCompanyIdentityAvailability(body);

    res.json(availability);
}
// US1-3. requireAuth runs first, so a second logout with the same token 401s.
export function logout(req: Request, res: Response): void {
    revokeToken(req.auth!.jti, req.auth!.exp);
    res.status(204).end();
}

// Placeholder until US1-4 lands the real company profile lookup.
export function getCurrentUser(req: Request, res: Response): void {
    res.json({ id: req.auth!.sub, role: req.auth!.role });
}
