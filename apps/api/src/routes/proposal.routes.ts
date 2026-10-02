import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    acceptProposalHandler,
    rejectProposalHandler,
} from '../controllers/proposal.controller';

export const proposalRoutes = Router();

// Accept a proposal: closes the listing, rejects the other pending proposals
// and creates the Project in one transaction (docs/conventions.md 2.7).
// Guards: authenticated only. No requireRole — the listing owner can be a
// Receiver (job posting) or a Provider (service); ownership is checked in
// lib/proposal.ts.
proposalRoutes.post('/:proposalId/accept', requireAuth, acceptProposalHandler);

// Reject a proposal: sets one PENDING proposal to REJECTED. Does not touch the
// listing. Same guards as accept: authenticated, and the listing owner (Receiver
// or Provider) is checked in lib/proposal.ts. Only a PENDING proposal can be
// rejected; anything else is 409.
proposalRoutes.post('/:proposalId/reject', requireAuth, rejectProposalHandler);
