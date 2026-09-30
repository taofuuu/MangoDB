import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    createListing,
    getMine,
    getService,
} from '../controllers/service.controller';

// Mounted at /listings.
export const serviceRoutes = Router();

// Guarded per route, like portfolio.routes.ts: public GETs will be added here
// later and must not inherit requireRole('provider').
serviceRoutes.post('/', requireAuth, requireRole('provider'), createListing);
serviceRoutes.get('/mine', requireAuth, requireRole('provider'), getMine);
serviceRoutes.get('/:listingId', requireAuth, getService);
