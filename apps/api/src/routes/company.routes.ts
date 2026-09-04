import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getMyProfile } from '../controllers/company.controller';

// Mounted at /companies. Everything here is the caller's own company, so it is
// authenticated but not role-restricted.
export const companyRoutes = Router();

companyRoutes.get('/me', requireAuth, getMyProfile);
// PATCH /me is US1-5.
