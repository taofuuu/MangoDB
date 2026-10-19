import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { uploadImage } from '../middleware/upload';
import {
    createPortfolio,
    deletePortfolio,
    updatePortfolio,
    getPortfolio,
    listPortfolios,
} from '../controllers/portfolio.controller';

// Mounted at /portfolios. portfolioId names the row on its own, so the
// listing does not appear in the path.
export const portfolioRoutes = Router();

// Guarded per route rather than with router.use, unlike admin.routes.ts:
// everything under /admin is admin-only, but a public GET of a listing's
// portfolio belongs here later and must not inherit requireRole('provider').

portfolioRoutes.get('/', listPortfolios);
portfolioRoutes.get('/:portfolioId', getPortfolio);

portfolioRoutes.post(
    '/',
    requireAuth,
    requireRole('provider'),
    uploadImage('portfolioImage'),
    createPortfolio,
);

// Owner-only: owning the portfolio is checked in the handler, so the role is
// checked on create only.
portfolioRoutes.patch(
    '/:portfolioId',
    requireAuth,
    uploadImage('portfolioImage'),
    updatePortfolio,
);

portfolioRoutes.delete('/:portfolioId', requireAuth, deletePortfolio);
