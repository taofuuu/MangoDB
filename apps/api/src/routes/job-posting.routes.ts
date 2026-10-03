import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    createJobPosting,
    getJobPosting,
    listJobPostings,
    listMyJobPostings
} from '../controllers/job-posting.controller';
import { createProposal } from '../controllers/proposal.controller';

export const jobPostingRoutes = Router();
// US2-7. List my own job postings.
jobPostingRoutes.get('/mine', requireAuth, listMyJobPostings);

// US2-7. List job postings with status filter and visibility rules.
// Guards: authenticated as any Company account (provider, receiver, both) or Admin.
jobPostingRoutes.get('/', requireAuth, listJobPostings);

// US2-7. Fetch a single job posting by ID with visibility rules.
// Guards: authenticated as any Company account (provider, receiver, both) or Admin.
jobPostingRoutes.get('/:jobPostingId', requireAuth, getJobPosting);

// US2-6. Create and publish a job posting.
// Guards: authenticated and holding Receiver role (BOTH accounts also qualify).
jobPostingRoutes.post(
    '/',
    requireAuth,
    requireRole('receiver'),
    createJobPosting,
);

// US2-8. Submit a proposal to an open job posting.
// Guards: authenticated and holding Provider role (BOTH accounts also qualify).
jobPostingRoutes.post(
    '/:jobPostingId/proposals',
    requireAuth,
    requireRole('provider'),
    createProposal,
);
