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
projectRoutes.get('/mine', requireAuth, listMyProjects);

// US4-9. One project, for its two parties. Others get 404.
projectRoutes.get('/:projectId', requireAuth, getProject);

// US4-9. The progress timeline, oldest first. Parties only, as above.
projectRoutes.get('/:projectId/updates', requireAuth, listProjectUpdates);

// US4-10. The Provider adds a progress note while IN_PROGRESS. Same guards,
// but only the Provider may act; the controller checks that per project.
projectRoutes.post('/:projectId/updates', requireAuth, createProjectUpdate);

// US4-3. The project's quotations, newest first, for both parties.
projectRoutes.get('/:projectId/quotations', requireAuth, listQuotations);

// US4-1. The Provider uploads a quotation PDF (a `file` field, up to 5 MB)
// while AWAITING_QUOTATION and no quotation is pending (ADR 0017).
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
projectRoutes.post('/:projectId/report-deposit', requireAuth, reportDeposit);

// US4-7. The Provider confirms the deposit arrived; the project goes
// IN_PROGRESS. Same guards as report-deposit, but only the Provider may act.
projectRoutes.post('/:projectId/confirm-deposit', requireAuth, confirmDeposit);

// US4-8. Either party cancels the project before work starts (ADR 0015).
projectRoutes.post('/:projectId/cancel', requireAuth, cancelProject);

// US4-11. The Provider reports the work complete; the project waits for the
// Receiver's acceptance. Same guards, but only the Provider may act.
projectRoutes.post('/:projectId/submit-work', requireAuth, submitWork);

// US4-12. The Receiver rejects the work with a reason; the project goes back
// to IN_PROGRESS. Same guards, but only the Receiver may act.
projectRoutes.post('/:projectId/reject-work', requireAuth, rejectWork);

// US4-13. The Receiver accepts the work; the project is COMPLETED and can be
// reviewed. Same guards, but only the Receiver may act.
projectRoutes.post('/:projectId/accept-work', requireAuth, acceptWork);

// US5-1. The Receiver reviews a completed project once. Four 1-5 scores and an
// optional comment (ADR 0018). Second review is 409.
projectRoutes.post('/:projectId/review', requireAuth, createReview);

// US5-3. The project's review, for both parties. 404 until the Receiver submits
// one. Outsiders get 404.
projectRoutes.get('/:projectId/review', requireAuth, getProjectReview);
