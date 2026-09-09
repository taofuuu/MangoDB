import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    changeMyCredentials,
    getMyProfile,
    updateMyProfile,
} from '../controllers/company.controller';

// Mounted at /companies. Everything here is the caller's own company, so it is
// authenticated but not role-restricted.
export const companyRoutes = Router();

companyRoutes.get('/me', requireAuth, getMyProfile);
companyRoutes.patch('/me', requireAuth, updateMyProfile);
// Username, email, and password. Separate from /me because every change here
// needs the current password, and mixing the two would put a gate on a route
// that also has an ungated path through it.
companyRoutes.patch('/me/credentials', requireAuth, changeMyCredentials);
