import type { ListingType } from '@mangodb/shared';

type SentProposalKind = {
    label: 'Hire request' | 'Job proposal';
    termHeading: 'Request term' | 'Proposal term';
};

// A sent proposal on a job is a proposal; one on a service is a hire request
// (ADR 0016). A BOTH company's list holds both, so each row says which.
export function sentProposalKind(listingType: ListingType): SentProposalKind {
    return listingType === 'SERVICE'
        ? { label: 'Hire request', termHeading: 'Request term' }
        : { label: 'Job proposal', termHeading: 'Proposal term' };
}
