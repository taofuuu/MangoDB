import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    addCertificate,
    updateCertificate,
    deleteCertificate,
} from '../controllers/certificate.controller';

export const certificateRoutes = Router();

certificateRoutes.post(
    '/',
    requireAuth,
    requireRole('provider'),
    addCertificate,
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
