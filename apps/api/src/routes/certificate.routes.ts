import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    createCertificate,
    updateCertificate,
    deleteCertificate,
    getCertificatesByProvider,
} from '../controllers/certificate.controller';
import { uploadImage } from '../middleware/upload';

export const certificateRoutes = Router();

certificateRoutes.get(
    '/provider',
    requireAuth,
    requireRole('provider'),
    getCertificatesByProvider,
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
