import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { createJobPosting } from '../controllers/job-posting.controller';

export const jobPostingRoutes = Router();

// US2-6. Create and publish a job posting.
// Guards: authenticated and holding Receiver role (BOTH accounts also qualify).
jobPostingRoutes.post(
    '/',
    requireAuth,
    requireRole('receiver'),
    createJobPosting,
);
