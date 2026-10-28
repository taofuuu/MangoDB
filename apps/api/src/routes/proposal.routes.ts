import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    acceptProposal,
    rejectProposal,
    listMyProposals,
    getMyProposalCounts,
} from '../controllers/proposal.controller';

export const proposalRoutes = Router();

// US2-9. List authenticated company's proposals or hire requests with pagination and status filter.
// Guards: authenticated and holding Provider or Receiver role (BOTH accounts also qualify).
/**
 * @openapi
 * /proposals/mine:
 *   get:
 *     tags: [Proposals]
 *     summary: List the proposals and hire requests I sent
 *     description: US2-9. Newest first.
 *     parameters:
 *       - $ref: '#/components/parameters/proposalStatus'
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/pageSize'
 *     responses:
 *       '200':
 *         description: One page of sent proposals
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SentProposalPage'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 */
proposalRoutes.get(
    '/mine',
    requireAuth,
    requireRole('provider', 'receiver'),
    listMyProposals,
);

// US2-9. The company's proposal counts by status, for the page's chips. Its
// own endpoint so /mine stays { items, pagination } (conventions §3).
// Same guards as /mine.
/**
 * @openapi
 * /proposals/mine/counts:
 *   get:
 *     tags: [Proposals]
 *     summary: Count my sent proposals by status
 *     description: US2-9. For the status chips.
 *     responses:
 *       '200':
 *         description: Counts by status, and the total
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProposalStatusCounts'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 */
proposalRoutes.get(
    '/mine/counts',
    requireAuth,
    requireRole('provider', 'receiver'),
    getMyProposalCounts,
);

// US2-11, US2-17. Accept a proposal: on a job, closes the job and rejects the
// other pending proposals; on a service, leaves the service open and other
// pending requests pending (ADR 0016). Creates the Project in the same
// transaction (docs/conventions.md 2.7).
// Guards: authenticated only. No requireRole — the listing owner can be a
// Receiver (job) or a Provider (service); ownership is checked in
// lib/proposal.ts.
/**
 * @openapi
 * /proposals/{proposalId}/accept:
 *   post:
 *     tags: [Proposals]
 *     summary: Accept a proposal on my listing
 *     description: US2-11, US2-17. Opens a project. On a job it also closes the job and rejects the other pending proposals. On a service the service stays open and other requests stay pending. All or nothing.
 *     parameters:
 *       - $ref: '#/components/parameters/proposalId'
 *     responses:
 *       '201':
 *         description: The new project
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
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
proposalRoutes.post('/:proposalId/accept', requireAuth, acceptProposal);

// Reject a proposal: sets one PENDING proposal to REJECTED. Does not touch the
// listing. Same guards as accept: authenticated, and the listing owner (Receiver
// or Provider) is checked in lib/proposal.ts. Only a PENDING proposal can be
// rejected; anything else is 409.
/**
 * @openapi
 * /proposals/{proposalId}/reject:
 *   post:
 *     tags: [Proposals]
 *     summary: Reject a proposal on my listing
 *     parameters:
 *       - $ref: '#/components/parameters/proposalId'
 *     responses:
 *       '204':
 *         description: Rejected
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
proposalRoutes.post('/:proposalId/reject', requireAuth, rejectProposal);
