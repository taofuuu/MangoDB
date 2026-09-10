import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { uploadImage } from '../middleware/upload';
import { createCertificate } from '../controllers/certificate.controller';

// Mounted at /companies. Everything here is the caller's own company, so it is
// authenticated but not role-restricted.
export const certificateRoutes = Router();

certificateRoutes.post(
    '/',
    requireAuth,
    requireRole('provider'),
    uploadImage('cert_image'),
    createCertificate,
);
