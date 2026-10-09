import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    createListing,
    deleteListing,
    getMine,
    getService,
    listServiceFilterOptions,
    listServices,
} from '../controllers/service.controller';

// Mounted at /services.
export const serviceRoutes = Router();

// Guarded per route, like portfolio.routes.ts: public GETs will be added here
// later and must not inherit requireRole('provider').
// US3-1. The search is the collection itself (conventions 2.10). Any company
// may search, admins may not, same as GET /companies.
serviceRoutes.get(
    '/',
    requireAuth,
    requireRole('provider', 'receiver'),
    listServices,
);
serviceRoutes.get(
    '/filter-options',
    requireAuth,
    requireRole('provider', 'receiver'),
    listServiceFilterOptions,
);
serviceRoutes.post('/', requireAuth, requireRole('provider'), createListing);
serviceRoutes.get('/mine', requireAuth, requireRole('provider'), getMine);
serviceRoutes.get('/:listingId', requireAuth, getService);
serviceRoutes.delete(
    '/:listingId',
    requireAuth,
    requireRole('provider'),
    deleteListing,
);
