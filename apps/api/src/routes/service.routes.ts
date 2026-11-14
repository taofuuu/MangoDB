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
import {
    createServiceProposal,
    listServiceProposals,
} from '../controllers/proposal.controller';

// Mounted at /services.
export const serviceRoutes = Router();

// Guarded per route, like portfolio.routes.ts: public GETs will be added here
// later and must not inherit requireRole('provider').
// US3-1. The search is the collection itself (conventions 2.10). Any company
// may search, admins may not, same as GET /companies.
/**
 * @openapi
 * /services:
 *   get:
 *     tags: [Services]
 *     summary: Search open services
 *     description: US3-1. Any company, not admins.
 *     parameters:
 *       - $ref: '#/components/parameters/q'
 *       - $ref: '#/components/parameters/category'
 *       - in: query
 *         name: techStack
 *         description: Tech names. Repeat the parameter for more than one.
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: integer
 *           minimum: 0
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: integer
 *           minimum: 0
 *       - $ref: '#/components/parameters/companyIdQuery'
 *       - $ref: '#/components/parameters/serviceOrderBy'
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/pageSize'
 *     responses:
 *       '200':
 *         description: One page of services
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceSummaryPage'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 */
serviceRoutes.get(
    '/',
    requireAuth,
    requireRole('provider', 'receiver'),
    listServices,
);

/**
 * @openapi
 * /services/filter-options:
 *   get:
 *     tags: [Services]
 *     summary: Get the choices for the search filters
 *     description: T3.2.2.
 *     responses:
 *       '200':
 *         description: Category names and tech names in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceFilterOptions'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 */
serviceRoutes.get(
    '/filter-options',
    requireAuth,
    requireRole('provider', 'receiver'),
    getServiceFilterOptions,
);

/**
 * @openapi
 * /services:
 *   post:
 *     tags: [Services]
 *     summary: Create a service (provider)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateServiceRequest'
 *     responses:
 *       '201':
 *         description: Created and open
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Service'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 */
serviceRoutes.post('/', requireAuth, requireRole('provider'), createService);

/**
 * @openapi
 * /services/mine:
 *   get:
 *     tags: [Services]
 *     summary: List my services (provider)
 *     parameters:
 *       - $ref: '#/components/parameters/listingStatus'
 *     responses:
 *       '200':
 *         description: The caller's services, newest first
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Service'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 */
serviceRoutes.get(
    '/mine',
    requireAuth,
    requireRole('provider'),
    listMyServices,
);
// Company accounts only, like the search: discovery is not an admin's.
/**
 * @openapi
 * /services/{serviceId}:
 *   get:
 *     tags: [Services]
 *     summary: Get one service
 *     description: Any company reads an open service. The owner reads its own in any status. Everything else is 404.
 *     parameters:
 *       - $ref: '#/components/parameters/serviceId'
 *     responses:
 *       '200':
 *         description: The service
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Service'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
serviceRoutes.get(
    '/:serviceId',
    requireAuth,
    requireRole('provider', 'receiver'),
    getService,
);
// Owner-only: signed in, and owning the service is checked in the handler.
// The role is checked on create only; owning a service already means it.
/**
 * @openapi
 * /services/{serviceId}:
 *   patch:
 *     tags: [Services]
 *     summary: Edit my service
 *     parameters:
 *       - $ref: '#/components/parameters/serviceId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateServiceRequest'
 *     responses:
 *       '200':
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Service'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
serviceRoutes.patch('/:serviceId', requireAuth, updateService);

/**
 * @openapi
 * /services/{serviceId}:
 *   delete:
 *     tags: [Services]
 *     summary: Delete my service
 *     description: US2-4. 409 when any project came from this service.
 *     parameters:
 *       - $ref: '#/components/parameters/serviceId'
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
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 */
serviceRoutes.delete('/:serviceId', requireAuth, deleteService);

// US2-16. List the hire requests on one service, so its Provider can pick one.
// Guards: authenticated and holding Provider role (BOTH accounts also qualify),
// so a Receiver is turned away before any lookup. Owning the service is checked
// in the controller; another Provider gets 403.
/**
 * @openapi
 * /services/{serviceId}/proposals:
 *   get:
 *     tags: [Services]
 *     summary: List the hire requests on my service (provider)
 *     description: US2-16. Owner only. Newest first.
 *     parameters:
 *       - $ref: '#/components/parameters/serviceId'
 *     responses:
 *       '200':
 *         description: Every hire request, with its sender
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ReceivedProposal'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
serviceRoutes.get(
    '/:serviceId/proposals',
    requireAuth,
    requireRole('provider'),
    listServiceProposals,
);

// US2-15. Send a hire request to an open service.
// Guards: authenticated and holding Receiver role (BOTH accounts also qualify).
/**
 * @openapi
 * /services/{serviceId}/proposals:
 *   post:
 *     tags: [Services]
 *     summary: Send a hire request to a service (receiver)
 *     description: US2-15. 403 on your own service. 409 when the service is closed or you already have a pending request on it.
 *     parameters:
 *       - $ref: '#/components/parameters/serviceId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProposalRequest'
 *     responses:
 *       '201':
 *         description: Sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Proposal'
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
serviceRoutes.post(
    '/:serviceId/proposals',
    requireAuth,
    requireRole('receiver'),
    createServiceProposal,
);
