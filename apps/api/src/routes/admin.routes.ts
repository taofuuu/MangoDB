import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    deleteCompanyAccount,
    getCompanyAccountDetail,
    listCompanyAccounts,
    updateCompanyAccount,
} from '../controllers/admin-company.controller';

export const adminRoutes = Router();

// Guarded once, so a new admin route cannot be added without the check. The
// account routes below shipped with their own requireAuth and no role check,
// because US6-1 had not landed and there were no administrator sessions to
// require. There are now, so they moved under the guard with everything else:
// a router with a guarded half and an unguarded half is a router someone will
// add a route to on the wrong side of the line.
adminRoutes.use(requireAuth, requireRole('admin'));

adminRoutes.get('/companies', listCompanyAccounts);
adminRoutes.get('/companies/:companyId', getCompanyAccountDetail);
adminRoutes.patch('/companies/:companyId', updateCompanyAccount);
adminRoutes.delete('/companies/:companyId', deleteCompanyAccount);

adminRoutes.get('/ping', (_req, res) => {
    res.json({ status: 'ok' });
});
