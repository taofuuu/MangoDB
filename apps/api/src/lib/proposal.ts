import { ApiError } from './api-error';
import { prisma } from './prisma';
import { companyBriefSelect, toCompanyBrief } from './company-profile';
import { closeOpenListing, rejectPendingProposals } from './listing';
import { createProjectFromProposal } from './project';
import type {
    CompanyBrief,
    ListingStatus,
    Project,
    Proposal,
    ProposalStatus,
    ProposalStatusCounts,
    ReceivedProposal,
    SentProposal,
} from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';

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
} as const satisfies Prisma.ProposalSelect;

export type ProposalRow = {
    proposalId: number;
    listingId: number;
    senderId: number;
    proposalBudget: Prisma.Decimal;
    proposalTerms: string;
    duration: Prisma.Decimal;
    proposalStatus: string;
    createdAt: Date;
};

// DTO function that shapes the Prisma row into the shared wire Proposal format.
// Converts Prisma Decimal to number and Date to ISO-8601 UTC string.
export function toProposal(row: ProposalRow): Proposal {
    return {
        proposalId: row.proposalId,
        listingId: row.listingId,
        senderId: row.senderId,
        proposalBudget: Number(row.proposalBudget),
        proposalTerms: row.proposalTerms,
        duration: Number(row.duration),
        proposalStatus: row.proposalStatus as ProposalStatus,
        createdAt: row.createdAt.toISOString(),
    };
}

// US2-10. A proposal as the listing's owner sees it in the proposal list: the
// proposal plus the sender's name and photo, so the list needs no second call
// per row to show who sent each one.
export const receivedProposalSelect = {
    ...proposalSelect,
    sender: { select: companyBriefSelect },
} as const satisfies Prisma.ProposalSelect;

type ReceivedProposalRow = ProposalRow & {
    sender: CompanyBrief;
};

export function toReceivedProposal(row: ReceivedProposalRow): ReceivedProposal {
    return {
        ...toProposal(row),
        sender: toCompanyBrief(row.sender),
    };
}

// US2-9. A proposal as its sender sees it in their own list: the proposal
// plus the listing's title and its owner, so the page needs no extra request
// per row. A soft-deleted owner is still shown: a proposal is history.
export const sentProposalSelect = {
    ...proposalSelect,
    listing: {
        select: {
            listingTitle: true,
            company: { select: companyBriefSelect },
        },
    },
} as const satisfies Prisma.ProposalSelect;

type SentProposalRow = ProposalRow & {
    listing: {
        listingTitle: string;
        company: CompanyBrief | null;
    };
};

export function toSentProposal(row: SentProposalRow): SentProposal {
    return {
        ...toProposal(row),
        listingTitle: row.listing.listingTitle,
        recipient: toCompanyBrief(row.listing.company),
    };
}

// US2-9. Turns a groupBy-by-status result into the four chip numbers.
// A status with no proposals is missing from groupBy's answer, so each
// one starts at zero.
export function toProposalStatusCounts(
    groups: { proposalStatus: string; _count: { _all: number } }[],
): ProposalStatusCounts {
    const counts: ProposalStatusCounts = {
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
    };
    for (const group of groups) {
        const n = group._count._all;
        counts.total += n;
        if (group.proposalStatus === ('PENDING' satisfies ProposalStatus))
            counts.pending = n;
        if (group.proposalStatus === ('ACCEPTED' satisfies ProposalStatus))
            counts.accepted = n;
        if (group.proposalStatus === ('REJECTED' satisfies ProposalStatus))
            counts.rejected = n;
    }
    return counts;
}

// The proposal an accept or reject acts on, read for its listing's owner:
// 404 for an unknown id, 403 when the caller does not own the listing it was
// sent to, 409 when it has been accepted or rejected already.
async function findPendingProposalFor(
    client: Prisma.TransactionClient,
    proposalId: number,
    callerId: number,
) {
    const proposal = await client.proposal.findUnique({
        where: { proposalId },
        select: {
            listingId: true,
            proposalStatus: true,
            proposalBudget: true,
            listing: { select: { listingStatus: true, companyId: true } },
        },
    });
    if (!proposal) throw ApiError.notFound('Proposal not found');
    if (callerId !== proposal.listing.companyId)
        throw ApiError.forbidden('You do not own this listing');
    if (proposal.proposalStatus !== ('PENDING' satisfies ProposalStatus))
        throw ApiError.conflict('Proposal is not pending');
    return proposal;
}

// Moves one PENDING proposal to ACCEPTED or REJECTED. The status in the
// where is the check: a concurrent accept or reject leaves nothing to match.
async function setProposalStatus(
    client: Prisma.TransactionClient,
    proposalId: number,
    proposalStatus: Exclude<ProposalStatus, 'PENDING'>,
): Promise<void> {
    const { count } = await client.proposal.updateMany({
        where: {
            proposalId,
            proposalStatus: 'PENDING' satisfies ProposalStatus,
        },
        data: { proposalStatus },
    });
    if (count === 0)
        throw ApiError.conflict(
            'Proposal has already been accepted or rejected',
        );
}

// US2-11. Accepting a proposal on a job closes the job, rejects the other
// proposals and opens a project, all or nothing. Each step is its own helper,
// so an accept that must leave its listing open (a hire request on a
// service) can leave out closeOpenListing.
export async function acceptProposalTx(
    proposalId: number,
    callerId: number,
): Promise<Project> {
    return prisma.$transaction(async (tx) => {
        const proposal = await findPendingProposalFor(tx, proposalId, callerId);
        if (proposal.listing.listingStatus !== ('OPEN' satisfies ListingStatus))
            throw ApiError.conflict('Listing has already been closed');

        await closeOpenListing(
            tx,
            proposal.listingId,
            'Listing has already been closed',
        );
        await setProposalStatus(tx, proposalId, 'ACCEPTED');
        await rejectPendingProposals(tx, proposal.listingId, proposalId);
        return createProjectFromProposal(tx, {
            proposalId,
            proposalBudget: proposal.proposalBudget,
        });
    });
}

export async function rejectPendingProposal(
    proposalId: number,
    callerId: number,
): Promise<void> {
    await findPendingProposalFor(prisma, proposalId, callerId);
    await setProposalStatus(prisma, proposalId, 'REJECTED');
}
