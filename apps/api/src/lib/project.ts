import type { Project, ProjectStatus } from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { toDateOnly } from './dates';

// The columns a project response carries. Exported with toProject for the
// project endpoints to come; accept reaches both through
// createProjectFromProposal.
export const projectSelect = {
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
// The status cast is safe because only PROJECT_STATUSES values are written.
export function toProject(row: ProjectRow): Project {
    return {
        ...row,
        totalBudget: Number(row.totalBudget),
        startDate: toDateOnly(row.startDate),
        projectStatus: row.projectStatus as ProjectStatus,
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
