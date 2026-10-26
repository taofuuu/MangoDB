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

/**
 * @openapi
 * /portfolios:
 *   get:
 *     tags: [Portfolios]
 *     summary: List portfolios of a service or a company
 *     description: Public. Send serviceId, companyId, or both. Neither is 400.
 *     security: []
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - $ref: '#/components/parameters/companyIdQuery'
 *     responses:
 *       '200':
 *         description: Portfolios, newest development date first
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServicePortfolio'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 */
portfolioRoutes.get('/', listPortfolios);

/**
 * @openapi
 * /portfolios/{portfolioId}:
 *   get:
 *     tags: [Portfolios]
 *     summary: Get one portfolio item
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/portfolioId'
 *     responses:
 *       '200':
 *         description: The portfolio item
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServicePortfolio'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
portfolioRoutes.get('/:portfolioId', getPortfolio);

/**
 * @openapi
 * /portfolios:
 *   post:
 *     tags: [Portfolios]
 *     summary: Add a portfolio item to my service (provider)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreatePortfolioRequest'
 *     responses:
 *       '201':
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServicePortfolio'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 */
portfolioRoutes.post(
    '/',
    requireAuth,
    requireRole('provider'),
    uploadImage('portfolioImage'),
    createPortfolio,
);

// Owner-only: owning the portfolio is checked in the handler, so the role is
// checked on create only.
/**
 * @openapi
 * /portfolios/{portfolioId}:
 *   patch:
 *     tags: [Portfolios]
 *     summary: Edit my portfolio item
 *     parameters:
 *       - $ref: '#/components/parameters/portfolioId'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePortfolioRequest'
 *     responses:
 *       '200':
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServicePortfolio'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 */
portfolioRoutes.patch(
    '/:portfolioId',
    requireAuth,
    uploadImage('portfolioImage'),
    updatePortfolio,
);

/**
 * @openapi
 * /portfolios/{portfolioId}:
 *   delete:
 *     tags: [Portfolios]
 *     summary: Delete my portfolio item
 *     parameters:
 *       - $ref: '#/components/parameters/portfolioId'
 *     responses:
 *       '204':
 *         description: Deleted
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
portfolioRoutes.delete('/:portfolioId', requireAuth, deletePortfolio);
