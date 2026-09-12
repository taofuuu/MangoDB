import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    changeMyCredentials,
    getMyProfile,
    requestMyAccountDeletion,
    updateMyProfile,
} from '../controllers/company.controller';

// Mounted at /companies. Everything here operates on the caller's own account.
export const companyRoutes = Router();

companyRoutes.get('/me', requireAuth, getMyProfile);
companyRoutes.patch('/me', requireAuth, updateMyProfile);
// Username, email, and password. Separate from /me because every change here
// needs the current password, and mixing the two would put a gate on a route
// that also has an ungated path through it.
companyRoutes.patch('/me/credentials', requireAuth, changeMyCredentials);
// A provider, receiver, or BOTH company may delete itself. Administrators use
// their own account-management routes and must not enter this self-service
// flow. requireRole understands that BOTH grants both company roles.
companyRoutes.delete(
    '/me',
    requireAuth,
    requireRole('provider', 'receiver'),
    requestMyAccountDeletion,
);
