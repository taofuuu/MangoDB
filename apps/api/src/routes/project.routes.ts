import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { reportDeposit } from '../controllers/project.controller';

export const projectRoutes = Router();

// US4-6. The Receiver reports the deposit as paid; the Provider confirms it
// later (US4-7). Guards: authenticated only. No requireRole: a BOTH account can
// be either side, so who is the Receiver is worked out per project in the
// controller (assertProjectParty). Outsiders get 404.
projectRoutes.post('/:projectId/report-deposit', requireAuth, reportDeposit);
