import { Router } from 'express';
import { deleteService } from '../controllers/service.controller';
import { requireAuth, requireRole } from '../middleware/auth';

// Mounted at /services. A BOTH company can also act as a provider because
// requireRole checks role grants rather than strict role equality.
export const serviceRoutes = Router();

serviceRoutes.delete(
    '/:listingId',
    requireAuth,
    requireRole('provider'),
    deleteService,
);
