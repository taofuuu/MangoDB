import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';

export const adminRoutes = Router();

// Guarded once, so a new admin route cannot be added without the check.
adminRoutes.use(requireAuth, requireRole('admin'));

adminRoutes.get('/ping', (_req, res) => {
    res.json({ status: 'ok' });
});
