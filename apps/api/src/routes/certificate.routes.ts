// import { Router } from 'express';
// import { requireAuth } from '../middleware/auth';
// import { addCertificate } from '../controllers/certificate.controller';

// // Mounted at /companies. Everything here is the caller's own company, so it is
// // authenticated but not role-restricted.
// export const certificateRoutes = Router();

// certificateRoutes.post('/', requireAuth, addCertificate);

// certificateRoutes.patch(
//     '/:portfolioId',
//     requireAuth,
//     requireRole('provider'),
//     updateCertificate,
// );

// certificateRoutes.delete(
//     '/:portfolioId',
//     requireAuth,
//     requireRole('provider'),
//     deleteCertificate,
// );

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
