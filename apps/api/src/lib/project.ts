import type {
    CompanyBrief,
    CompletedProject,
    ListingType,
    Project,
    ProjectDetail,
    ProjectRole,
    ProjectStatus,
    ProjectSummary,
    ProjectUpdate,
    ProjectUpdateType,
} from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { ApiError } from './api-error';
import { companyBriefSelect, toCompanyBrief } from './company-profile';
import { toDateOnly } from './dates';
import { prisma } from './prisma';
import { averageScore } from './rating';
import {
    serviceTechStackSelect,
    toTechStackNames,
    type ServiceTechStackRow,
} from './service';

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

// US2-5. What GET /companies/:companyId/completed-projects fetches. The Provider
// is the subject of the page, so both parties are named, with listing details,
// start/completed dates, categories, tech stack, and review summary.
export const completedProjectSelect = {
    projectId: true,
    startDate: true,
    completedAt: true,
    review: {
        select: {
            workQualityScore: true,
            serviceScore: true,
            valueForMoneyScore: true,
            deliveryTimeScore: true,
            comment: true,
        },
    },
    proposal: {
        select: {
            sender: { select: companyBriefSelect },
            listing: {
                select: {
                    listingTitle: true,
                    listingDesc: true,
                    listingType: true,
                    company: { select: companyBriefSelect },
                    listingCategory: {
                        select: {
                            category: { select: { categoryName: true } },
                        },
                    },
                    service: serviceTechStackSelect,
                },
            },
        },
    },
} as const satisfies Prisma.ProjectSelect;

export type CompletedProjectRow = {
    projectId: number;
    startDate: Date;
    completedAt: Date | null;
    review: {
        workQualityScore: number;
        serviceScore: number;
        valueForMoneyScore: number;
        deliveryTimeScore: number;
        comment: string | null;
    } | null;
    proposal: {
        sender: {
            companyId: number;
            companyName: string;
            companyPhoto: string | null;
        };
        listing: {
            listingTitle: string;
            listingDesc: string;
            listingType: string;
            company: {
                companyId: number;
                companyName: string;
                companyPhoto: string | null;
            } | null;
            listingCategory: {
                category: { categoryName: string };
            }[];
            service: ServiceTechStackRow;
        };
    };
};

export function toCompletedProject(row: CompletedProjectRow): CompletedProject {
    if (!row.completedAt) {
        throw new ApiError(
            500,
            'INTERNAL',
            'Completed project has no completedAt',
        );
    }
    const isService =
        row.proposal.listing.listingType === ('SERVICE' satisfies ListingType);
    const sender = toCompanyBrief(row.proposal.sender);
    const owner = toCompanyBrief(row.proposal.listing.company);
    const provider = isService ? owner : sender;
    const receiver = isService ? sender : owner;
    return {
        projectId: row.projectId,
        listingType: row.proposal.listing.listingType as ListingType,
        listingTitle: row.proposal.listing.listingTitle,
        listingDesc: row.proposal.listing.listingDesc,
        categories: row.proposal.listing.listingCategory.map(
            (lc) => lc.category.categoryName,
        ),
        techStack: isService
            ? toTechStackNames(row.proposal.listing.service)
            : [],
        startDate: toDateOnly(row.startDate),
        completedAt: row.completedAt.toISOString(),
        provider,
        receiver,
        rating: averageScore(row.review ? [row.review] : []),
        reviewComment: row.review?.comment ?? null,
    };
}

// Opens the project for an accepted proposal, inside the caller's
// transaction: the proposal's budget, starting today (UTC). It waits for the
// Provider's quotation first (ADR 0015). Its timeline starts with the accept.
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
    await saveProjectEvent(tx, row.projectId, 'PROPOSAL_ACCEPTED');
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

// A Provider's COMPLETED projects: the sender on a job, the owner on a
// service. The rule projectParties applies, written as a filter.
export function providerCompletedProjectsWhere(
    companyId: number,
): Prisma.ProjectWhereInput {
    return {
        projectStatus: 'COMPLETED' satisfies ProjectStatus,
        OR: [
            {
                proposal: {
                    senderId: companyId,
                    listing: { listingType: 'JOB' satisfies ListingType },
                },
            },
            {
                proposal: {
                    listing: {
                        companyId,
                        listingType: 'SERVICE' satisfies ListingType,
                    },
                },
            },
        ],
    };
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

// ADR 0015: the only moves a project may make. COMPLETED and CANCELLED are
// final. Who may make each move is checked by the endpoint, not here.
const PROJECT_MOVES: Record<ProjectStatus, readonly ProjectStatus[]> = {
    AWAITING_QUOTATION: ['AWAITING_DEPOSIT', 'CANCELLED'],
    AWAITING_DEPOSIT: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['AWAITING_ACCEPTANCE'],
    AWAITING_ACCEPTANCE: ['IN_PROGRESS', 'COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
};

// Moves a project to its next status, inside the caller's transaction. A
// move the table above does not list is a 409 that writes nothing. The from
// in the where is the check: after a double click, or the other party moving
// it a moment ago, nothing matches, so that is a 409 too.
export async function moveProjectStatus(
    tx: Prisma.TransactionClient,
    projectId: number,
    from: ProjectStatus,
    to: ProjectStatus,
): Promise<void> {
    if (!PROJECT_MOVES[from].includes(to)) {
        throw ApiError.conflict(`Project cannot move from ${from} to ${to}`);
    }
    const { count } = await tx.project.updateMany({
        where: { projectId, projectStatus: from },
        data: { projectStatus: to },
    });
    if (count === 0) {
        throw ApiError.conflict(`Project is not ${from}`);
    }
}

// US4-9. A project with what its pages show beside it: the listing it came
// from and both parties. A soft-deleted party is still selected: a project
// is history (see Company.deletedAt).
export const projectViewSelect = {
    ...projectSelect,
    proposal: {
        select: {
            senderId: true,
            sender: { select: companyBriefSelect },
            listing: {
                select: {
                    listingId: true,
                    listingType: true,
                    listingTitle: true,
                    companyId: true,
                    company: { select: companyBriefSelect },
                },
            },
        },
    },
} as const satisfies Prisma.ProjectSelect;

type ProjectViewRow = ProjectRow & {
    proposal: PartiesRow & {
        sender: CompanyBrief;
        listing: {
            listingId: number;
            listingTitle: string;
            company: CompanyBrief | null;
        };
    };
};

// Both parties as briefs, and which one the caller is. projectParties says
// who is who, so the job/service rule stays in one place.
function viewParties(
    proposal: ProjectViewRow['proposal'],
    callerId: number,
): { provider: CompanyBrief; receiver: CompanyBrief; myRole: ProjectRole } {
    const { providerId } = projectParties(proposal);
    const sender = toCompanyBrief(proposal.sender);
    const owner = toCompanyBrief(proposal.listing.company);
    const senderIsProvider = providerId === proposal.senderId;
    return {
        provider: senderIsProvider ? sender : owner,
        receiver: senderIsProvider ? owner : sender,
        myRole: callerId === providerId ? 'provider' : 'receiver',
    };
}

// One row of GET /projects/mine. proposal is pulled out of the row so the
// nested select does not leak into the response through toProject's spread.
export function toProjectSummary(
    row: ProjectViewRow,
    callerId: number,
): ProjectSummary {
    const { proposal, ...project } = row;
    const { provider, receiver, myRole } = viewParties(proposal, callerId);
    return {
        ...toProject(project),
        listingTitle: proposal.listing.listingTitle,
        myRole,
        otherParty: myRole === 'provider' ? receiver : provider,
    };
}

// GET /projects/:projectId. Same row, with both parties named.
export function toProjectDetail(
    row: ProjectViewRow,
    callerId: number,
): ProjectDetail {
    const { proposal, ...project } = row;
    return {
        ...toProject(project),
        listingId: proposal.listing.listingId,
        listingType: proposal.listing.listingType as ListingType,
        listingTitle: proposal.listing.listingTitle,
        ...viewParties(proposal, callerId),
    };
}

// #212. Saves one event on the project's timeline, inside the caller's
// transaction, so an action that is refused saves no event either. For the
// events with no text; PROGRESS and WORK_REJECTED write their own row.
export async function saveProjectEvent(
    tx: Prisma.TransactionClient,
    projectId: number,
    updateType: Exclude<ProjectUpdateType, 'PROGRESS' | 'WORK_REJECTED'>,
): Promise<void> {
    await tx.projectUpdate.create({ data: { projectId, updateType } });
}

// One entry of a project's timeline (US4-9, US4-10, US4-12, #212).
export const projectUpdateSelect = {
    projectUpdateId: true,
    projectId: true,
    updateType: true,
    updateText: true,
    createdAt: true,
} as const satisfies Prisma.ProjectUpdateSelect;

type ProjectUpdateRow = {
    projectUpdateId: number;
    projectId: number;
    updateType: string;
    updateText: string | null;
    createdAt: Date;
};

// The type cast is safe because only PROJECT_UPDATE_TYPES values are written.
export function toProjectUpdate(row: ProjectUpdateRow): ProjectUpdate {
    return {
        ...row,
        updateType: row.updateType as ProjectUpdateType,
        createdAt: row.createdAt.toISOString(),
    };
}
