import { ApiError } from './ApiError';
import { prisma } from './prisma';
import type {
    PostingProposal,
    Proposal,
    ProposalStatus,
    ListingStatus,
    Project,
    ProjectStatus,
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
} as const;

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
        jobPostingId: row.listingId,
        providerId: row.senderId,
        proposalBudget: Number(row.proposalBudget),
        proposalTerms: row.proposalTerms,
        duration: Number(row.duration),
        proposalStatus: row.proposalStatus as ProposalStatus,
        createdAt: row.createdAt.toISOString(),
    };
}

// US2-11. A proposal as the posting's owner sees it in the proposal list: the
// proposal plus the sender's name and photo, so the list needs no second call
// per row to show who each Provider is.
export const postingProposalSelect = {
    ...proposalSelect,
    company: {
        select: { companyId: true, companyName: true, companyPhoto: true },
    },
} as const;

export type SelectedPostingProposal = SelectedProposal & {
    company: {
        companyId: number;
        companyName: string;
        companyPhoto: string | null;
    };
};

export function toPostingProposal(
    row: SelectedPostingProposal,
): PostingProposal {
    return {
        ...toProposal(row),
        provider: {
            companyId: row.company.companyId,
            companyName: row.company.companyName,
            companyPhoto: row.company.companyPhoto,
        },
    };
}

const projectSelect = {
    projId: true,
    proposalId: true,
    totalBudget: true,
    startDate: true,
    status: true,
} as const;

type ProjectRow = {
    projId: number;
    proposalId: number;
    totalBudget: Prisma.Decimal;
    startDate: Date;
    status: string;
};

// Decimal and Date do not survive JSON as the frontend expects, so both are
// converted here: budget to a number, the date-only column to YYYY-MM-DD.
// The status cast is safe because this file only ever writes ProjectStatus values.
function toProject(row: ProjectRow): Project {
    return {
        ...row,
        totalBudget: Number(row.totalBudget),
        startDate: row.startDate.toISOString().slice(0, 10),
        status: row.status as ProjectStatus,
    };
}

export async function acceptProposal(
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
                status: 'ACTIVE' satisfies ProjectStatus,
            },
            select: projectSelect,
        });
        return toProject(project);
    });
}

export async function rejectProposal(
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
