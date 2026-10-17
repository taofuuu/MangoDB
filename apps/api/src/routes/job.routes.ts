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
jobRoutes.get('/mine', requireAuth, requireRole('receiver'), listMyJobs);

// US2-7. List job postings with status filter and visibility rules.
// Guards: authenticated as any Company account (provider, receiver, both) or Admin.
jobRoutes.get('/', requireAuth, listJobs);

// US2-7. Fetch a single job posting by ID with visibility rules.
// Guards: authenticated as any Company account (provider, receiver, both) or Admin.
jobRoutes.get('/:jobId', requireAuth, getJob);

// US2-6. Create and publish a job posting.
// Guards: authenticated and holding Receiver role (BOTH accounts also qualify).
jobRoutes.post('/', requireAuth, requireRole('receiver'), createJob);

// US2-10. List the proposals on one job posting, so its Receiver can pick one.
// Guards: authenticated and holding Receiver role (BOTH accounts also qualify),
// so a Provider is turned away before any lookup. Owning the posting is checked
// in the controller; another Receiver gets 403.
jobRoutes.get(
    '/:jobId/proposals',
    requireAuth,
    requireRole('receiver'),
    listJobProposals,
);
// US2-13. Edit a job posting: only the owner, only while it is Open.
// Guards: authenticated only. No requireRole: owning the posting already means
// a Receiver, and the ownership check lives in lib/job.ts.
jobRoutes.patch('/:jobId', requireAuth, updateJob);

// US2-14. Close a job posting and reject its pending proposals. An action
// endpoint, not PATCH { listingStatus }, because it changes other rows too
// (docs/conventions.md 2.7). Same guards and owner rule as edit.
jobRoutes.post('/:jobId/close', requireAuth, closeJob);

// US2-8. Submit a proposal to an open job posting.
// Guards: authenticated and holding Provider role (BOTH accounts also qualify).
jobRoutes.post(
    '/:jobId/proposals',
    requireAuth,
    requireRole('provider'),
    createProposal,
);
