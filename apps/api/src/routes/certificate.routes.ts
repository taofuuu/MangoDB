import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { addCertificate } from '../controllers/certificate.controller';

// Mounted at /companies. Everything here is the caller's own company, so it is
// authenticated but not role-restricted.
export const certificateRoutes = Router();

certificateRoutes.post('/', requireAuth, addCertificate);
