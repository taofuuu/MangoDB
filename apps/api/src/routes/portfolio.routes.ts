import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    createPortfolio,
    deletePortfolio,
    updatePortfolio,
    getPortfolio,
    getAllPortfolios,
} from '../controllers/portfolio.controller';

// Mounted at /portfolios. portfolio_id names the row on its own, so the
// listing does not appear in the path.
export const portfolioRoutes = Router();

// Guarded per route rather than with router.use, unlike admin.routes.ts:
// everything under /admin is admin-only, but a public GET of a listing's
// portfolio belongs here later and must not inherit requireRole('provider').

portfolioRoutes.get('/', getAllPortfolios);
portfolioRoutes.get('/:portfolioId', getPortfolio);

portfolioRoutes.post(
    '/',
    requireAuth,
    requireRole('provider'),
    createPortfolio,
);

portfolioRoutes.patch(
    '/:portfolioId',
    requireAuth,
    requireRole('provider'),
    updatePortfolio,
);
portfolioRoutes.delete(
    '/:portfolioId',
    requireAuth,
    requireRole('provider'),
    deletePortfolio,
);
