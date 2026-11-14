import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { uploadPdf } from '../middleware/upload';
import {
    acceptWork,
    cancelProject,
    confirmDeposit,
    createProjectUpdate,
    createReview,
    getProject,
    getProjectReview,
    listMyProjects,
    listProjectUpdates,
    rejectWork,
    reportDeposit,
    submitWork,
} from '../controllers/project.controller';
import {
    createQuotation,
    listQuotations,
} from '../controllers/quotation.controller';

export const projectRoutes = Router();

// US4-9. The caller's projects, as Provider and as Receiver, paged. No
// requireRole, for the same reason as report-deposit below. Declared before
// /:projectId, or Express would try "mine" as an id.
/**
 * @openapi
 * /projects/mine:
 *   get:
 *     tags: [Projects]
 *     summary: List my projects
 *     description: US4-9. As Provider and as Receiver, newest first.
 *     parameters:
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/pageSize'
 *     responses:
 *       '200':
 *         description: One page of projects
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectSummaryPage'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 */
projectRoutes.get('/mine', requireAuth, listMyProjects);

// US4-9. One project, for its two parties. Others get 404.
/**
 * @openapi
 * /projects/{projectId}:
 *   get:
 *     tags: [Projects]
 *     summary: Get one of my projects
 *     description: US4-9. Anyone but its two parties gets 404.
 *     parameters:
 *       - $ref: '#/components/parameters/projectId'
 *     responses:
 *       '200':
 *         description: The project
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectDetail'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
projectRoutes.get('/:projectId', requireAuth, getProject);

// US4-9. The progress timeline, oldest first. Parties only, as above.
/**
 * @openapi
 * /projects/{projectId}/updates:
 *   get:
 *     tags: [Projects]
 *     summary: Get a project's progress timeline
 *     description: US4-9. Oldest first. Progress notes and rejected-work reasons.
 *     parameters:
 *       - $ref: '#/components/parameters/projectId'
 *     responses:
 *       '200':
 *         description: The timeline
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProjectUpdate'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
projectRoutes.get('/:projectId/updates', requireAuth, listProjectUpdates);

// US4-10. The Provider adds a progress note while IN_PROGRESS. Same guards,
// but only the Provider may act; the controller checks that per project.
/**
 * @openapi
 * /projects/{projectId}/updates:
 *   post:
 *     tags: [Projects]
 *     summary: Add a progress note (Provider)
 *     description: US4-10. Only while IN_PROGRESS (409). The Receiver gets 403.
 *     parameters:
 *       - $ref: '#/components/parameters/projectId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectUpdateRequest'
 *     responses:
 *       '201':
 *         description: Added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectUpdate'
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
projectRoutes.post('/:projectId/updates', requireAuth, createProjectUpdate);

// US4-3. The project's quotations, newest first, for both parties.
/**
 * @openapi
 * /projects/{projectId}/quotations:
 *   get:
 *     tags: [Projects]
 *     summary: List a project's quotations
 *     description: US4-3. Newest first, a plain array (not paged). Parties only; others get 404.
 *     parameters:
 *       - $ref: '#/components/parameters/projectId'
 *     responses:
 *       '200':
 *         description: The quotations, each with its PDF link and decision status
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Quotation'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
projectRoutes.get('/:projectId/quotations', requireAuth, listQuotations);

// US4-1. The Provider uploads a quotation PDF (a `file` field, up to 5 MB)
// while AWAITING_QUOTATION and no quotation is pending (ADR 0017).
/**
 * @openapi
 * /projects/{projectId}/quotations:
 *   post:
 *     tags: [Projects]
 *     summary: Upload a quotation PDF (Provider)
 *     description: >-
 *       US4-1. Only while AWAITING_QUOTATION and no quotation is PENDING (409).
 *       The Receiver gets 403. The project status does not change yet.
 *     parameters:
 *       - $ref: '#/components/parameters/projectId'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/QuotationRequest'
 *     responses:
 *       '201':
 *         description: Uploaded. The new quotation is PENDING.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quotation'
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
projectRoutes.post(
    '/:projectId/quotations',
    requireAuth,
    uploadPdf('file'),
    createQuotation,
);

// US4-6. The Receiver reports the deposit as paid; the Provider confirms it
// later (US4-7). Guards: authenticated only. No requireRole: a BOTH account can
// be either side, so who is the Receiver is worked out per project in the
// controller (assertProjectParty). Outsiders get 404.
/**
 * @openapi
 * /projects/{projectId}/report-deposit:
 *   post:
 *     tags: [Projects]
 *     summary: Report the deposit as paid (Receiver)
 *     description: US4-6. Only while AWAITING_DEPOSIT. The status does not change yet.
 *     parameters:
 *       - $ref: '#/components/parameters/projectId'
 *     responses:
 *       '200':
 *         description: The project, with depositReportedAt set
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
projectRoutes.post('/:projectId/report-deposit', requireAuth, reportDeposit);

// US4-7. The Provider confirms the deposit arrived; the project goes
// IN_PROGRESS. Same guards as report-deposit, but only the Provider may act.
/**
 * @openapi
 * /projects/{projectId}/confirm-deposit:
 *   post:
 *     tags: [Projects]
 *     summary: Confirm the deposit arrived (Provider)
 *     description: US4-7. AWAITING_DEPOSIT to IN_PROGRESS, after the Receiver reported it.
 *     parameters:
 *       - $ref: '#/components/parameters/projectId'
 *     responses:
 *       '200':
 *         description: The project, now IN_PROGRESS
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
projectRoutes.post('/:projectId/confirm-deposit', requireAuth, confirmDeposit);

// US4-8. Either party cancels the project before work starts (ADR 0015).
/**
 * @openapi
 * /projects/{projectId}/cancel:
 *   post:
 *     tags: [Projects]
 *     summary: Cancel the project (either party)
 *     description: >-
 *       US4-8. Only from AWAITING_QUOTATION or AWAITING_DEPOSIT (409 after that).
 *       Either party may cancel; others get 404.
 *     parameters:
 *       - $ref: '#/components/parameters/projectId'
 *     responses:
 *       '200':
 *         description: The project, now CANCELLED
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 */
projectRoutes.post('/:projectId/cancel', requireAuth, cancelProject);

// US4-11. The Provider reports the work complete; the project waits for the
// Receiver's acceptance. Same guards, but only the Provider may act.
/**
 * @openapi
 * /projects/{projectId}/submit-work:
 *   post:
 *     tags: [Projects]
 *     summary: Report the work complete (Provider)
 *     description: US4-11. IN_PROGRESS to AWAITING_ACCEPTANCE.
 *     parameters:
 *       - $ref: '#/components/parameters/projectId'
 *     responses:
 *       '200':
 *         description: The project, now AWAITING_ACCEPTANCE
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
projectRoutes.post('/:projectId/submit-work', requireAuth, submitWork);

// US4-12. The Receiver rejects the work with a reason; the project goes back
// to IN_PROGRESS. Same guards, but only the Receiver may act.
/**
 * @openapi
 * /projects/{projectId}/reject-work:
 *   post:
 *     tags: [Projects]
 *     summary: Reject the work with a reason (Receiver)
 *     description: US4-12. AWAITING_ACCEPTANCE back to IN_PROGRESS. The reason goes on the timeline.
 *     parameters:
 *       - $ref: '#/components/parameters/projectId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RejectWorkRequest'
 *     responses:
 *       '200':
 *         description: The project, now IN_PROGRESS
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
projectRoutes.post('/:projectId/reject-work', requireAuth, rejectWork);

// US4-13. The Receiver accepts the work; the project is COMPLETED and can be
// reviewed. Same guards, but only the Receiver may act.
/**
 * @openapi
 * /projects/{projectId}/accept-work:
 *   post:
 *     tags: [Projects]
 *     summary: Accept the work (Receiver)
 *     description: US4-13. AWAITING_ACCEPTANCE to COMPLETED.
 *     parameters:
 *       - $ref: '#/components/parameters/projectId'
 *     responses:
 *       '200':
 *         description: The project, now COMPLETED
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
projectRoutes.post('/:projectId/accept-work', requireAuth, acceptWork);

// US5-1. The Receiver reviews a completed project once. Four 1-5 scores and an
// optional comment (ADR 0018). Second review is 409.
/**
 * @openapi
 * /projects/{projectId}/review:
 *   post:
 *     tags: [Projects]
 *     summary: Review a completed project (Receiver)
 *     description: US5-1. Once per project (409 the second time). Only when COMPLETED.
 *     parameters:
 *       - $ref: '#/components/parameters/projectId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReviewRequest'
 *     responses:
 *       '201':
 *         description: Reviewed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
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
projectRoutes.post('/:projectId/review', requireAuth, createReview);

// US5-3. The project's review, for both parties. 404 until the Receiver submits
// one. Outsiders get 404.
/**
 * @openapi
 * /projects/{projectId}/review:
 *   get:
 *     tags: [Projects]
 *     summary: Get a project's review
 *     description: US5-3. 404 until the Receiver submits one.
 *     parameters:
 *       - $ref: '#/components/parameters/projectId'
 *     responses:
 *       '200':
 *         description: The review
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
projectRoutes.get('/:projectId/review', requireAuth, getProjectReview);
