import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    getProviderService,
    addProviderService,
    updateProviderService,
} from '../controllers/provider.controller';

// Mounted at /providers.
export const providerRoutes = Router();

// All routes here belong to the authenticated provider. Guarded once.
providerRoutes.use(requireAuth, requireRole('provider'));

// US1-7 & US1-8. Provider service information, service terms, and warranty policies.
providerRoutes.get('/me/service', getProviderService);
providerRoutes.post('/me/service', addProviderService);
providerRoutes.patch('/me/service', updateProviderService);
