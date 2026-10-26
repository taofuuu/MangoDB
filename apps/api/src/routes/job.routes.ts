import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    closeJob,
    createJob,
    getJob,
    listJobs,
    listMyJobs,
    updateJob,
} from '../controllers/job.controller';
import {
    createProposal,
    listJobProposals,
} from '../controllers/proposal.controller';

export const jobRoutes = Router();
// US2-2. List my own job postings, every status, newest first.
// Guards: authenticated and holding Receiver role, like /services/mine.
/**
 * @openapi
 * /jobs/mine:
 *   get:
 *     tags: [Jobs]
 *     summary: List my job postings (receiver)
 *     description: US2-2. Every status, newest first.
 *     parameters:
 *       - $ref: '#/components/parameters/listingStatus'
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/pageSize'
 *     responses:
 *       '200':
 *         description: One page of job postings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobPage'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 */
jobRoutes.get('/mine', requireAuth, requireRole('receiver'), listMyJobs);

// US2-7. List jobs with a status filter and the visibility rules.
// Guards: company accounts only, like the service search; not admins.
/**
 * @openapi
 * /jobs:
 *   get:
 *     tags: [Jobs]
 *     summary: Search job postings
 *     description: US2-7, US3-4, US3-5. Open postings are visible to every company. Closed ones only to their owner.
 *     parameters:
 *       - $ref: '#/components/parameters/listingStatus'
 *       - $ref: '#/components/parameters/companyIdQuery'
 *       - $ref: '#/components/parameters/q'
 *       - $ref: '#/components/parameters/category'
 *       - in: query
 *         name: minBudget
 *         schema:
 *           type: integer
 *           minimum: 0
 *       - in: query
 *         name: maxBudget
 *         schema:
 *           type: integer
 *           minimum: 0
 *       - in: query
 *         name: deadline
 *         description: Deadline on or before this date
 *         schema:
 *           type: string
 *           format: date
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/pageSize'
 *     responses:
 *       '200':
 *         description: One page of job postings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobPage'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 */
jobRoutes.get('/', requireAuth, requireRole('provider', 'receiver'), listJobs);

// US2-7. One job, with the visibility rules. Same guards as the list.
/**
 * @openapi
 * /jobs/{jobId}:
 *   get:
 *     tags: [Jobs]
 *     summary: Get one job posting
 *     description: US2-7. A closed posting is 404 for everyone but its owner.
 *     parameters:
 *       - $ref: '#/components/parameters/jobId'
 *     responses:
 *       '200':
 *         description: The job posting
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
jobRoutes.get(
    '/:jobId',
    requireAuth,
    requireRole('provider', 'receiver'),
    getJob,
);

// US2-6. Create and publish a job posting.
// Guards: authenticated and holding Receiver role (BOTH accounts also qualify).
/**
 * @openapi
 * /jobs:
 *   post:
 *     tags: [Jobs]
 *     summary: Post a job (receiver)
 *     description: US2-6.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJobRequest'
 *     responses:
 *       '201':
 *         description: Created and open
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 */
jobRoutes.post('/', requireAuth, requireRole('receiver'), createJob);

// US2-10. List the proposals on one job posting, so its Receiver can pick one.
// Guards: authenticated and holding Receiver role (BOTH accounts also qualify),
// so a Provider is turned away before any lookup. Owning the posting is checked
// in the controller; another Receiver gets 403.
/**
 * @openapi
 * /jobs/{jobId}/proposals:
 *   get:
 *     tags: [Jobs]
 *     summary: List the proposals on my job posting
 *     description: US2-10. Owner only. Newest first.
 *     parameters:
 *       - $ref: '#/components/parameters/jobId'
 *     responses:
 *       '200':
 *         description: Every proposal, with its sender
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
jobRoutes.get(
    '/:jobId/proposals',
    requireAuth,
    requireRole('receiver'),
    listJobProposals,
);
// US2-13. Edit a job posting: only the owner, only while it is Open.
// Guards: authenticated only. No requireRole: owning the posting already means
// a Receiver, and the ownership check lives in lib/listing.ts.
/**
 * @openapi
 * /jobs/{jobId}:
 *   patch:
 *     tags: [Jobs]
 *     summary: Edit my job posting
 *     description: US2-13. Owner only, and only while open (409).
 *     parameters:
 *       - $ref: '#/components/parameters/jobId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateJobRequest'
 *     responses:
 *       '200':
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
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
jobRoutes.patch('/:jobId', requireAuth, updateJob);

// US2-14. Close a job posting and reject its pending proposals. An action
// endpoint, not PATCH { listingStatus }, because it changes other rows too
// (docs/conventions.md 2.7). Same guards and owner rule as edit.
/**
 * @openapi
 * /jobs/{jobId}/close:
 *   post:
 *     tags: [Jobs]
 *     summary: Close my job posting
 *     description: US2-14. Also rejects every pending proposal on it.
 *     parameters:
 *       - $ref: '#/components/parameters/jobId'
 *     responses:
 *       '200':
 *         description: The closed posting
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
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
jobRoutes.post('/:jobId/close', requireAuth, closeJob);

// US2-8. Submit a proposal to an open job posting.
// Guards: authenticated and holding Provider role (BOTH accounts also qualify).
/**
 * @openapi
 * /jobs/{jobId}/proposals:
 *   post:
 *     tags: [Jobs]
 *     summary: Send a proposal to a job (provider)
 *     description: US2-8. 403 on your own job. 409 when the job is closed or you already have a pending proposal on it.
 *     parameters:
 *       - $ref: '#/components/parameters/jobId'
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
jobRoutes.post(
    '/:jobId/proposals',
    requireAuth,
    requireRole('provider'),
    createProposal,
);
