import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    getCompanyAccountDetail,
    listCompanyAccounts,
} from '../controllers/admin-company.controller';

export const adminRoutes = Router();

// Temporary until US6-1 supplies administrator sessions: a valid session is
// still required so the private contact fields are never exposed publicly.
adminRoutes.get('/companies', requireAuth, listCompanyAccounts);
adminRoutes.get('/companies/:companyId', requireAuth, getCompanyAccountDetail);

// Guarded once, so a new admin route cannot be added without the check.
adminRoutes.use(requireAuth, requireRole('admin'));

adminRoutes.get('/ping', (_req, res) => {
    res.json({ status: 'ok' });
});
