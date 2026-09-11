import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    createCertificate,
    updateCertificate,
    deleteCertificate,
} from '../controllers/certificate.controller';
import { uploadImage } from '../middleware/upload';

export const certificateRoutes = Router();

certificateRoutes.post(
    '/',
    requireAuth,
    requireRole('provider'),
    uploadImage('cert_image'),
    createCertificate,
);

certificateRoutes.patch(
    '/:certificateId',
    requireAuth,
    requireRole('provider'),
    updateCertificate,
);

certificateRoutes.delete(
    '/:certificateId',
    requireAuth,
    requireRole('provider'),
    deleteCertificate,
);
