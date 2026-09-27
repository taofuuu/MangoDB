import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { listProviders } from '../controllers/provider.controller';

export const providerRoutes = Router();

// GET /providers, not /providers/search (conventions 2.10): a search is the
// collection with filters on it, like GET /admin/companies. Any company may
// search, admins may not. requireRole understands that BOTH grants both roles.
providerRoutes.get(
    '/',
    requireAuth,
    requireRole('provider', 'receiver'),
    listProviders,
);
