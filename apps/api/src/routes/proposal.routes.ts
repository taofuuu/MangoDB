import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    acceptProposal,
    rejectProposal,
    listMyProposals,
    getMyProposalCounts,
} from '../controllers/proposal.controller';

export const proposalRoutes = Router();

// US2-9. List authenticated company's proposals or hire requests with pagination and status filter.
// Guards: authenticated and holding Provider or Receiver role (BOTH accounts also qualify).
proposalRoutes.get(
    '/mine',
    requireAuth,
    requireRole('provider', 'receiver'),
    listMyProposals,
);

// US2-9. The company's proposal counts by status, for the page's chips. Its
// own endpoint so /mine stays { items, pagination } (conventions §3).
// Same guards as /mine.
proposalRoutes.get(
    '/mine/counts',
    requireAuth,
    requireRole('provider', 'receiver'),
    getMyProposalCounts,
);

// Accept a proposal: closes the listing, rejects the other pending proposals
// and creates the Project in one transaction (docs/conventions.md 2.7).
// Guards: authenticated only. No requireRole — the listing owner can be a
// Receiver (job posting) or a Provider (service); ownership is checked in
// lib/proposal.ts.
proposalRoutes.post('/:proposalId/accept', requireAuth, acceptProposal);

// Reject a proposal: sets one PENDING proposal to REJECTED. Does not touch the
// listing. Same guards as accept: authenticated, and the listing owner (Receiver
// or Provider) is checked in lib/proposal.ts. Only a PENDING proposal can be
// rejected; anything else is 409.
proposalRoutes.post('/:proposalId/reject', requireAuth, rejectProposal);
