import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    createJobPosting,
    getJobPosting,
    listJobPostings,
} from '../controllers/job-posting.controller';
import {
    createProposal,
    listPostingProposals,
} from '../controllers/proposal.controller';

export const jobPostingRoutes = Router();

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

// US2-10. List the proposals on one job posting, so its Receiver can pick one.
// Guards: authenticated and holding Receiver role (BOTH accounts also qualify),
// so a Provider is turned away before any lookup. Owning the posting is checked
// in the controller; another Receiver gets 403.
jobPostingRoutes.get(
    '/:jobPostingId/proposals',
    requireAuth,
    requireRole('receiver'),
    listPostingProposals,
);

// US2-8. Submit a proposal to an open job posting.
// Guards: authenticated and holding Provider role (BOTH accounts also qualify).
jobPostingRoutes.post(
    '/:jobPostingId/proposals',
    requireAuth,
    requireRole('provider'),
    createProposal,
);
