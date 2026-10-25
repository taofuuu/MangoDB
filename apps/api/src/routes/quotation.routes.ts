import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    acceptQuotation,
    deleteQuotation,
} from '../controllers/quotation.controller';

// Mounted at /quotations. quotationId names the row on its own, so the project
// does not appear in the path (conventions §2.4).
export const quotationRoutes = Router();

// US4-4. The Receiver accepts a pending quotation and moves the project
// from AWAITING_QUOTATION to AWAITING_DEPOSIT in one transaction (ADR 0015, ADR 0017).
quotationRoutes.post('/:quotationId/accept', requireAuth, acceptQuotation);

// US4-2. The Provider deletes a pending quotation and its PDF from storage.
// No requireRole: a BOTH account can be either side, so the Provider check runs
// per project in the controller (assertQuotationParty). Outsiders get 404.
quotationRoutes.delete('/:quotationId', requireAuth, deleteQuotation);
