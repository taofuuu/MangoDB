import type { Proposal, ProposalStatus } from '@mangodb/shared';

// The columns a proposal query selects. Naming them explicitly keeps the
// wire response deliberate rather than exposing whatever the table happens to have.
export const proposalSelect = {
    proposalId: true,
    listingId: true,
    senderId: true,
    proposalBudget: true,
    proposalTerms: true,
    duration: true,
    proposalStatus: true,
    createdAt: true,
} as const;

export type SelectedProposal = {
    proposalId: number;
    listingId: number;
    senderId: number;
    proposalBudget: { toNumber(): number } | number | string;
    proposalTerms: string;
    duration: { toNumber(): number } | number | string | null;
    proposalStatus: string;
    createdAt: Date;
};

// DTO function that shapes the Prisma row into the shared wire Proposal format.
// Converts Prisma Decimal to number and Date to ISO-8601 UTC string.
export function toProposal(row: SelectedProposal): Proposal {
    return {
        proposalId: row.proposalId,
        jobPostingId: row.listingId,
        providerId: row.senderId,
        proposalBudget: Number(row.proposalBudget),
        proposalTerms: row.proposalTerms,
        duration: row.duration != null ? Number(row.duration) : 0,
        proposalStatus: row.proposalStatus as ProposalStatus,
        createdAt: row.createdAt.toISOString(),
    };
}
