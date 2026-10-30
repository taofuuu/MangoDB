import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    acceptQuotation,
    deleteQuotation,
    rejectQuotation,
} from '../controllers/quotation.controller';

// Mounted at /quotations. quotationId names the row on its own, so the project
// does not appear in the path (conventions §2.4).
export const quotationRoutes = Router();

// US4-4. The Receiver accepts a pending quotation and moves the project
// from AWAITING_QUOTATION to AWAITING_DEPOSIT in one transaction (ADR 0015, ADR 0017).
/**
 * @openapi
 * /quotations/{quotationId}/accept:
 *   post:
 *     tags: [Quotations]
 *     summary: Accept a quotation (Receiver)
 *     description: >-
 *       US4-4. Only while PENDING. Moves the project from AWAITING_QUOTATION to AWAITING_DEPOSIT in one transaction. The Provider gets 403; outsiders get 404.
 *     parameters:
 *       - $ref: '#/components/parameters/quotationId'
 *     responses:
 *       '200':
 *         description: The quotation, now ACCEPTED
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quotation'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 */
quotationRoutes.post('/:quotationId/accept', requireAuth, acceptQuotation);

// US4-5. The Receiver rejects a pending quotation; the project stays
// AWAITING_QUOTATION so the Provider can send a new one (ADR 0015, ADR 0017).
/**
 * @openapi
 * /quotations/{quotationId}/reject:
 *   post:
 *     tags: [Quotations]
 *     summary: Reject a quotation (Receiver)
 *     description: >-
 *       US4-5. Only while PENDING and the project is AWAITING_QUOTATION. The project stays AWAITING_QUOTATION so the Provider can send a new one. The Provider gets 403; outsiders get 404.
 *     parameters:
 *       - $ref: '#/components/parameters/quotationId'
 *     responses:
 *       '200':
 *         description: The quotation, now REJECTED
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quotation'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 */
quotationRoutes.post('/:quotationId/reject', requireAuth, rejectQuotation);

// US4-2. The Provider deletes a pending quotation and its PDF from storage.
// No requireRole: a BOTH account can be either side, so the Provider check runs
// per project in the controller (assertQuotationParty). Outsiders get 404.
/**
 * @openapi
 * /quotations/{quotationId}:
 *   delete:
 *     tags: [Quotations]
 *     summary: Delete a pending quotation (Provider)
 *     description: >-
 *       US4-2. Only while PENDING (409 if the Receiver has decided). Also removes the PDF from storage. The Receiver gets 403; outsiders get 404.
 *     parameters:
 *       - $ref: '#/components/parameters/quotationId'
 *     responses:
 *       '204':
 *         description: Deleted
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 */
quotationRoutes.delete('/:quotationId', requireAuth, deleteQuotation);
