import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { createListing } from '../controllers/service-listing.controller';

// Mounted at /listings.
export const listingRoutes = Router();

// Guarded per route, like portfolio.routes.ts: public GETs will be added here
// later and must not inherit requireRole('provider').
listingRoutes.post('/', requireAuth, requireRole('provider'), createListing);
