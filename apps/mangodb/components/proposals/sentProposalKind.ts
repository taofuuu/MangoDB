import type { ListingType } from '@mangodb/shared';

// A sent proposal on a job is a proposal; one on a service is a hire request
// (ADR 0016). A BOTH company's list holds both, so each row says which.
export function sentProposalKind(listingType: ListingType): string {
    return listingType === 'SERVICE' ? 'Hire request' : 'Job proposal';
}
