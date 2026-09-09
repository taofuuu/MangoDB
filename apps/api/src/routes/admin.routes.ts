import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    getCompanyAccountDetail,
    listCompanyAccounts,
} from '../controllers/admin-company.controller';

export const adminRoutes = Router();

// TODO(US6-1): Move these routes below the admin guard once admin accounts and
// role-based access are available. They are temporarily public so US6-2's
// Company account list and detail UI can be developed with real database data.
adminRoutes.get('/companies', listCompanyAccounts);
adminRoutes.get('/companies/:companyId', getCompanyAccountDetail);

// Guarded once, so a new admin route cannot be added without the check.
adminRoutes.use(requireAuth, requireRole('admin'));

adminRoutes.get('/ping', (_req, res) => {
    res.json({ status: 'ok' });
});
