import { ApiError } from './api-error';
import { prisma } from './prisma';
import { companyBriefSelect, toCompanyBrief } from './company-profile';
import type {
    CompanyBrief,
    ListingStatus,
    Project,
    ProjectStatus,
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

export type SelectedProposal = {
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
export function toProposal(row: SelectedProposal): Proposal {
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

export type SelectedReceivedProposal = SelectedProposal & {
    sender: CompanyBrief;
};

export function toReceivedProposal(
    row: SelectedReceivedProposal,
): ReceivedProposal {
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

export type SelectedSentProposal = SelectedProposal & {
    listing: {
        listingTitle: string;
        company: CompanyBrief | null;
    };
};

export function toSentProposal(row: SelectedSentProposal): SentProposal {
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

const projectSelect = {
    projectId: true,
    proposalId: true,
    totalBudget: true,
    startDate: true,
    projectStatus: true,
} as const satisfies Prisma.ProjectSelect;

type ProjectRow = {
    projectId: number;
    proposalId: number;
    totalBudget: Prisma.Decimal;
    startDate: Date;
    projectStatus: string;
};

// Decimal and Date do not survive JSON as the frontend expects, so both are
// converted here: budget to a number, the date-only column to YYYY-MM-DD.
// The status cast is safe because this file only ever writes ProjectStatus values.
function toProject(row: ProjectRow): Project {
    return {
        ...row,
        totalBudget: Number(row.totalBudget),
        startDate: row.startDate.toISOString().slice(0, 10),
        projectStatus: row.projectStatus as ProjectStatus,
    };
}

export async function acceptProposalTx(
    proposalId: number,
    callerId: number,
): Promise<Project> {
    return prisma.$transaction(async (tx) => {
        const proposal = await tx.proposal.findUnique({
            where: {
                proposalId: proposalId,
            },
            select: {
                listingId: true,
                proposalStatus: true,
                proposalBudget: true,
                listing: {
                    select: {
                        listingId: true,
                        listingStatus: true,
                        companyId: true,
                    },
                },
            },
        });
        if (!proposal) throw ApiError.notFound('Proposal not found');
        if (!proposal.listing) throw ApiError.notFound('Listing not found');
        if (callerId !== proposal.listing.companyId)
            throw ApiError.forbidden('You do not own this listing');
        if (proposal.proposalStatus !== ('PENDING' satisfies ProposalStatus))
            throw ApiError.conflict('Proposal is not pending');
        if (proposal.listing.listingStatus !== ('OPEN' satisfies ListingStatus))
            throw ApiError.conflict('Listing has already been closed');
        const { count: closedCount } = await tx.listing.updateMany({
            where: {
                listingId: proposal.listing.listingId,
                listingStatus: 'OPEN' satisfies ListingStatus,
            },
            data: {
                listingStatus: 'CLOSED' satisfies ListingStatus,
            },
        });
        if (closedCount === 0)
            throw ApiError.conflict('Listing has already been closed');
        const { count: acceptedCount } = await tx.proposal.updateMany({
            where: {
                proposalId: proposalId,
                proposalStatus: 'PENDING' satisfies ProposalStatus,
            },
            data: {
                proposalStatus: 'ACCEPTED' satisfies ProposalStatus,
            },
        });
        if (acceptedCount === 0)
            throw ApiError.conflict(
                'Proposal has already been accepted or rejected',
            );
        await tx.proposal.updateMany({
            where: {
                listingId: proposal.listingId,
                proposalId: { not: proposalId },
                proposalStatus: 'PENDING' satisfies ProposalStatus,
            },
            data: {
                proposalStatus: 'REJECTED' satisfies ProposalStatus,
            },
        });
        const todayUtc = new Date();
        todayUtc.setUTCHours(0, 0, 0, 0);

        const project = await tx.project.create({
            data: {
                proposalId,
                totalBudget: proposal.proposalBudget,
                startDate: todayUtc,
                projectStatus: 'ACTIVE' satisfies ProjectStatus,
            },
            select: projectSelect,
        });
        return toProject(project);
    });
}

export async function rejectPendingProposal(
    proposalId: number,
    callerId: number,
): Promise<void> {
    const proposal = await prisma.proposal.findUnique({
        where: {
            proposalId: proposalId,
        },
        select: {
            proposalStatus: true,
            listing: {
                select: {
                    companyId: true,
                },
            },
        },
    });
    if (!proposal) throw ApiError.notFound('Proposal not found');
    if (!proposal.listing) throw ApiError.notFound('Listing not found');
    if (callerId !== proposal.listing.companyId)
        throw ApiError.forbidden('You do not own this listing');
    if (proposal.proposalStatus !== ('PENDING' satisfies ProposalStatus))
        throw ApiError.conflict('Proposal is not pending');
    const { count: rejectedCount } = await prisma.proposal.updateMany({
        where: {
            proposalId: proposalId,
            proposalStatus: 'PENDING' satisfies ProposalStatus,
        },
        data: {
            proposalStatus: 'REJECTED' satisfies ProposalStatus,
        },
    });
    if (rejectedCount === 0)
        throw ApiError.conflict(
            'Proposal has already been accepted or rejected',
        );
}
