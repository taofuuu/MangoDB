import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    createCertificate,
    updateCertificate,
    deleteCertificate,
    getMyCertificates,
} from '../controllers/certificate.controller';
import { uploadImage } from '../middleware/upload';

export const certificateRoutes = Router();

// /mine, not /provider: conventions 2.3 — /me is the singular thing that is
// you, /mine is a collection filtered to you.
certificateRoutes.get(
    '/mine',
    requireAuth,
    requireRole('provider'),
    getMyCertificates,
);

certificateRoutes.post(
    '/',
    requireAuth,
    requireRole('provider'),
    uploadImage('certImage'),
    createCertificate,
);

certificateRoutes.patch(
    '/:certificateId',
    requireAuth,
    requireRole('provider'),
    uploadImage('certImage'),
    updateCertificate,
);

certificateRoutes.delete(
    '/:certificateId',
    requireAuth,
    requireRole('provider'),
    deleteCertificate,
);
