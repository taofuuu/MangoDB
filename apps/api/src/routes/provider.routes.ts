import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { listProviders } from '../controllers/provider.controller';

export const providerRoutes = Router();

// GET /providers, not /providers/search (conventions 2.10): a search is the
// collection with filters on it, like GET /admin/companies. Any signed-in
// company may search; a BOTH account is a Receiver too.
providerRoutes.get('/', requireAuth, listProviders);
