import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { uploadImage } from '../middleware/upload';
import {
    createPortfolio,
    deletePortfolio,
    updatePortfolio,
} from '../controllers/portfolio.controller';

// Mounted at /portfolios. portfolio_id names the row on its own, so the
// listing does not appear in the path.
export const portfolioRoutes = Router();

portfolioRoutes.post(
    '/',
    requireAuth,
    requireRole('provider'),
    uploadImage.single('portfolio_image'),
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