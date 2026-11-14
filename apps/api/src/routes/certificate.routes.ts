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
/**
 * @openapi
 * /certificates/mine:
 *   get:
 *     tags: [Certificates]
 *     summary: List my certificates (provider)
 *     responses:
 *       '200':
 *         description: The caller's certificates, newest first
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Certificate'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 */
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
/**
 * @openapi
 * /certificates:
 *   get:
 *     tags: [Certificates]
 *     summary: List one company's certificates
 *     description: An unknown, deleted or non-provider company gives an empty list.
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: The company's certificates, newest first
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Certificate'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 */
certificateRoutes.get(
    '/',
    requireAuth,
    requireRole('provider', 'receiver'),
    listCompanyCertificates,
);

/**
 * @openapi
 * /certificates:
 *   post:
 *     tags: [Certificates]
 *     summary: Add a certificate (provider)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CertificateRequest'
 *     responses:
 *       '201':
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Certificate'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 */
certificateRoutes.post(
    '/',
    requireAuth,
    requireRole('provider'),
    uploadImage('certImage'),
    createCertificate,
);

// Owner-only: owning the certificate is checked in the handler, so the role
// is checked on create only.
/**
 * @openapi
 * /certificates/{certificateId}:
 *   patch:
 *     tags: [Certificates]
 *     summary: Edit my certificate
 *     description: Another company's certificate answers 404.
 *     parameters:
 *       - $ref: '#/components/parameters/certificateId'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CertificateRequest'
 *     responses:
 *       '200':
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Certificate'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
certificateRoutes.patch(
    '/:certificateId',
    requireAuth,
    uploadImage('certImage'),
    updateCertificate,
);

/**
 * @openapi
 * /certificates/{certificateId}:
 *   delete:
 *     tags: [Certificates]
 *     summary: Delete my certificate
 *     parameters:
 *       - $ref: '#/components/parameters/certificateId'
 *     responses:
 *       '204':
 *         description: Deleted
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
certificateRoutes.delete('/:certificateId', requireAuth, deleteCertificate);
