import type { Request, Response } from 'express';
import type {
    CompletedProject,
    ListingType,
    Paginated,
    ProjectStatus,
} from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/api-error';
import { pageArgs, toPagination } from '../lib/pagination';
import { orConflict } from '../lib/prisma-errors';
import {
    assertProjectParty,
    completedProjectSelect,
    moveProjectStatus,
    projectSelect,
    toCompletedProject,
    toProject,
} from '../lib/project';
import { parseParams, parseQuery } from '../middleware/validate';
import { companyIdParamSchema } from '../schemas/company.schema';
import {
    completedProjectListQuerySchema,
    projectIdParamSchema,
} from '../schemas/project.schema';

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

// US2-5. A Provider's completed work, newest first, for its public profile.
// Unknown, soft-deleted, and admin accounts answer 404 (same as getCompanyProfile).
export async function listProviderCompletedProjects(
    req: Request,
    res: Response,
): Promise<void> {
    const { companyId } = parseParams(companyIdParamSchema, req.params);
    const { page, pageSize } = parseQuery(
        completedProjectListQuerySchema,
        req.query,
    );

    const company = await prisma.company.findFirst({
        where: { companyId, deletedAt: null, accountType: { not: 'ADMIN' } },
        select: { companyId: true },
    });
    if (!company) {
        throw ApiError.notFound('Company not found');
    }

    const where: Prisma.ProjectWhereInput = {
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
                        listingType: 'SERVICE' satisfies ListingType,
                        companyId: companyId,
                    },
                },
            },
        ],
    };

    const [totalItems, rows] = await prisma.$transaction([
        prisma.project.count({ where }),
        prisma.project.findMany({
            where,
            ...pageArgs({ page, pageSize }),
            orderBy: [{ completedAt: 'desc' }, { projectId: 'desc' }],
            select: completedProjectSelect,
        }),
    ]);

    const body: Paginated<CompletedProject> = {
        items: rows.map(toCompletedProject),
        pagination: toPagination(totalItems, { page, pageSize }),
    };

    res.json(body);
}
