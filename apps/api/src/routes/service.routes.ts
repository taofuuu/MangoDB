import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    createService,
    deleteService,
    listMyServices,
    getService,
    getServiceFilterOptions,
    listServices,
    updateService,
} from '../controllers/service.controller';
import { createServiceProposal } from '../controllers/proposal.controller';

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
    getServiceFilterOptions,
);
serviceRoutes.post('/', requireAuth, requireRole('provider'), createService);
serviceRoutes.get(
    '/mine',
    requireAuth,
    requireRole('provider'),
    listMyServices,
);
// Company accounts only, like the search: discovery is not an admin's.
serviceRoutes.get(
    '/:serviceId',
    requireAuth,
    requireRole('provider', 'receiver'),
    getService,
);
// Owner-only: signed in, and owning the service is checked in the handler.
// The role is checked on create only; owning a service already means it.
serviceRoutes.patch('/:serviceId', requireAuth, updateService);
serviceRoutes.delete('/:serviceId', requireAuth, deleteService);

// US2-15. Send a hire request to an open service.
// Guards: authenticated and holding Receiver role (BOTH accounts also qualify).
serviceRoutes.post(
    '/:serviceId/proposals',
    requireAuth,
    requireRole('receiver'),
    createServiceProposal,
);
