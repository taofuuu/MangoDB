import type { Request, Response } from 'express';
import type { Paginated, ProjectStatus, ProjectSummary } from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/api-error';
import { pageArgs, toPagination } from '../lib/pagination';
import { orConflict } from '../lib/prisma-errors';
import {
    assertProjectParty,
    moveProjectStatus,
    projectSelect,
    projectViewSelect,
    toProject,
    toProjectSummary,
} from '../lib/project';
import { parseParams, parseQuery } from '../middleware/validate';
import {
    projectIdParamSchema,
    projectListQuerySchema,
} from '../schemas/project.schema';

// US4-9 (T4.9.2). The caller's projects, newest first. A BOTH account gets
// the ones it provides and the ones it receives in one list.
export async function listMyProjects(
    req: Request,
    res: Response,
): Promise<void> {
    const callerId = req.auth!.companyId;
    const { page, pageSize } = parseQuery(projectListQuerySchema, req.query);

    // The two parties are the proposal's sender and the listing's owner
    // (projectParties). No deletedAt filter: a project is history.
    const where: Prisma.ProjectWhereInput = {
        proposal: {
            OR: [{ senderId: callerId }, { listing: { companyId: callerId } }],
        },
    };

    const [totalItems, rows] = await prisma.$transaction([
        prisma.project.count({ where }),
        prisma.project.findMany({
            where,
            ...pageArgs({ page, pageSize }),
            // A project has no createdAt; its id grows with each one opened.
            orderBy: { projectId: 'desc' },
            select: projectViewSelect,
        }),
    ]);

    const body: Paginated<ProjectSummary> = {
        items: rows.map((row) => toProjectSummary(row, callerId)),
        pagination: toPagination(totalItems, { page, pageSize }),
    };
    res.json(body);
}

// US4-6. The Receiver says the deposit is paid. Only the time is recorded:
// the status stays AWAITING_DEPOSIT until the Provider confirms it (ADR 0015).
// No money moves through the system.
export async function reportDeposit(
    req: Request,
    res: Response,
): Promise<void> {
    const { projectId } = parseParams(projectIdParamSchema, req.params);
    const project = await assertProjectParty(projectId, req.auth!.companyId);

    // A party already knows the project exists, so the Provider gets 403, not 404.
    if (project.myRole !== 'receiver') {
        throw ApiError.forbidden('Only the Receiver can report the deposit');
    }
    if (
        project.projectStatus !== ('AWAITING_DEPOSIT' satisfies ProjectStatus)
    ) {
        throw ApiError.conflict('Project is not AWAITING_DEPOSIT');
    }

    // The where repeats the checks, so a double click finds no row to update
    // and becomes a 409 instead of moving the time.
    const row = await orConflict(
        prisma.project.update({
            where: {
                projectId,
                projectStatus: 'AWAITING_DEPOSIT' satisfies ProjectStatus,
                depositReportedAt: null,
            },
            data: { depositReportedAt: new Date() },
            select: projectSelect,
        }),
        'Deposit has already been reported',
    );
    res.json(toProject(row));
}

// US4-7. The Provider confirms the deposit arrived, and the work starts:
// AWAITING_DEPOSIT to IN_PROGRESS, with the time. Only after the Receiver
// reported it (ADR 0015).
export async function confirmDeposit(
    req: Request,
    res: Response,
): Promise<void> {
    const { projectId } = parseParams(projectIdParamSchema, req.params);
    const project = await assertProjectParty(projectId, req.auth!.companyId);

    if (project.myRole !== 'provider') {
        throw ApiError.forbidden('Only the Provider can confirm the deposit');
    }

    // One transaction: if the deposit was never reported, the 409 also undoes
    // the status move.
    const row = await prisma.$transaction(async (tx) => {
        await moveProjectStatus(
            tx,
            projectId,
            'AWAITING_DEPOSIT',
            'IN_PROGRESS',
        );
        return orConflict(
            tx.project.update({
                where: { projectId, depositReportedAt: { not: null } },
                data: { depositConfirmedAt: new Date() },
                select: projectSelect,
            }),
            'The Receiver has not reported the deposit yet',
        );
    });
    res.json(toProject(row));
}
