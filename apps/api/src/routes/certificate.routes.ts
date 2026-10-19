import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    createCertificate,
    updateCertificate,
    deleteCertificate,
    listMyCertificates,
    listCompanyCertificates,
} from '../controllers/certificate.controller';
import { uploadImage } from '../middleware/upload';

export const certificateRoutes = Router();

// /mine, not /provider: conventions 2.3 — /me is the singular thing that is
// you, /mine is a collection filtered to you.
certificateRoutes.get(
    '/mine',
    requireAuth,
    requireRole('provider'),
    listMyCertificates,
);

// One company's certificates, for its public profile (/companies/:companyId).
// Same callers as GET /companies/:companyId, which that page loads with it:
// any company, not admins. companyId is a required query filter rather than
// /companies/:companyId/certificates because certificates are top-level here
// already (conventions 2.4), like ?companyId= on GET /portfolios.
certificateRoutes.get(
    '/',
    requireAuth,
    requireRole('provider', 'receiver'),
    listCompanyCertificates,
);

certificateRoutes.post(
    '/',
    requireAuth,
    requireRole('provider'),
    uploadImage('certImage'),
    createCertificate,
);

// Owner-only: owning the certificate is checked in the handler, so the role
// is checked on create only.
certificateRoutes.patch(
    '/:certificateId',
    requireAuth,
    uploadImage('certImage'),
    updateCertificate,
);

certificateRoutes.delete('/:certificateId', requireAuth, deleteCertificate);
