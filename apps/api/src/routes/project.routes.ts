import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    confirmDeposit,
    getProject,
    listMyProjects,
    reportDeposit,
} from '../controllers/project.controller';

export const projectRoutes = Router();

// US4-9. The caller's projects, as Provider and as Receiver, paged. No
// requireRole, for the same reason as report-deposit below. Declared before
// /:projectId, or Express would try "mine" as an id.
projectRoutes.get('/mine', requireAuth, listMyProjects);

// US4-9. One project, for its two parties. Others get 404.
projectRoutes.get('/:projectId', requireAuth, getProject);

// US4-6. The Receiver reports the deposit as paid; the Provider confirms it
// later (US4-7). Guards: authenticated only. No requireRole: a BOTH account can
// be either side, so who is the Receiver is worked out per project in the
// controller (assertProjectParty). Outsiders get 404.
projectRoutes.post('/:projectId/report-deposit', requireAuth, reportDeposit);

// US4-7. The Provider confirms the deposit arrived; the project goes
// IN_PROGRESS. Same guards as report-deposit, but only the Provider may act.
projectRoutes.post('/:projectId/confirm-deposit', requireAuth, confirmDeposit);
