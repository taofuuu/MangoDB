import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    createJobPosting,
    listJobPostings,
} from '../controllers/job-posting.controller';

export const jobPostingRoutes = Router();

// US2-7. List job postings with status filter and visibility rules.
// Guards: authenticated as any Company account (provider, receiver, both) or Admin.
jobPostingRoutes.get('/', requireAuth, listJobPostings);

// US2-6. Create and publish a job posting.
// Guards: authenticated and holding Receiver role (BOTH accounts also qualify).
jobPostingRoutes.post(
    '/',
    requireAuth,
    requireRole('receiver'),
    createJobPosting,
);
