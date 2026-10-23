import type {
    ListingType,
    Project,
    ProjectRole,
    ProjectStatus,
} from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { ApiError } from './api-error';
import { toDateOnly } from './dates';
import { prisma } from './prisma';

// The columns a project response carries. Exported with toProject for the
// project endpoints to come; accept reaches both through
// createProjectFromProposal.
export const projectSelect = {
    projectId: true,
    proposalId: true,
    totalBudget: true,
    startDate: true,
    projectStatus: true,
    depositReportedAt: true,
    depositConfirmedAt: true,
    completedAt: true,
} as const satisfies Prisma.ProjectSelect;

type ProjectRow = {
    projectId: number;
    proposalId: number;
    totalBudget: Prisma.Decimal;
    startDate: Date;
    projectStatus: string;
    depositReportedAt: Date | null;
    depositConfirmedAt: Date | null;
    completedAt: Date | null;
};

// Decimal and Date do not survive JSON as the frontend expects, so both are
// converted here: budget to a number, the date-only column to YYYY-MM-DD,
// timestamps to ISO strings.
// The status cast is safe because only PROJECT_STATUSES values are written.
export function toProject(row: ProjectRow): Project {
    return {
        ...row,
        totalBudget: Number(row.totalBudget),
        startDate: toDateOnly(row.startDate),
        projectStatus: row.projectStatus as ProjectStatus,
        depositReportedAt: row.depositReportedAt?.toISOString() ?? null,
        depositConfirmedAt: row.depositConfirmedAt?.toISOString() ?? null,
        completedAt: row.completedAt?.toISOString() ?? null,
    };
}

// Opens the project for an accepted proposal, inside the caller's
// transaction: the proposal's budget, starting today (UTC). It waits for the
// Provider's quotation first (ADR 0015).
export async function createProjectFromProposal(
    tx: Prisma.TransactionClient,
    proposal: { proposalId: number; proposalBudget: Prisma.Decimal },
): Promise<Project> {
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);

    const row = await tx.project.create({
        data: {
            proposalId: proposal.proposalId,
            totalBudget: proposal.proposalBudget,
            startDate: todayUtc,
            projectStatus: 'AWAITING_QUOTATION' satisfies ProjectStatus,
        },
        select: projectSelect,
    });
    return toProject(row);
}

type PartiesRow = {
    senderId: number;
    listing: { listingType: string; companyId: number | null };
};

// ADR 0016. A project's two parties are the sender of the accepted proposal
// and the owner of the listing. On a job the sender is the Provider; on a
// service the sender is the Receiver. Every endpoint asks here, never itself.
export function projectParties(proposal: PartiesRow): {
    providerId: number;
    receiverId: number;
} {
    const ownerId = proposal.listing.companyId;
    // Same broken-row rule as toCompanyBrief: a 500, not a guess.
    if (ownerId === null) {
        throw new ApiError(500, 'INTERNAL', 'Listing has no owning company');
    }
    return proposal.listing.listingType === ('SERVICE' satisfies ListingType)
        ? { providerId: ownerId, receiverId: proposal.senderId }
        : { providerId: proposal.senderId, receiverId: ownerId };
}

export type ProjectParty = {
    projectStatus: ProjectStatus;
    providerId: number;
    receiverId: number;
    myRole: ProjectRole;
};

const PROJECT_NOT_FOUND = 'Project not found';

// Every /projects/:projectId endpoint starts here. To a company outside the
// project it does not exist, so 404, not 403 (conventions §4). Which of the
// two parties may act is the endpoint's own check, against myRole.
export async function assertProjectParty(
    projectId: number,
    callerId: number,
): Promise<ProjectParty> {
    const project = await prisma.project.findUnique({
        where: { projectId },
        select: {
            projectStatus: true,
            proposal: {
                select: {
                    senderId: true,
                    listing: { select: { listingType: true, companyId: true } },
                },
            },
        },
    });
    if (!project) throw ApiError.notFound(PROJECT_NOT_FOUND);

    const parties = projectParties(project.proposal);
    if (callerId !== parties.providerId && callerId !== parties.receiverId) {
        throw ApiError.notFound(PROJECT_NOT_FOUND);
    }
    return {
        projectStatus: project.projectStatus as ProjectStatus,
        ...parties,
        myRole: callerId === parties.providerId ? 'provider' : 'receiver',
    };
}
