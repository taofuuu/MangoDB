import type { Request, Response } from 'express';
import type {
    CompletedProject,
    Paginated,
    ProjectStatus,
    ProjectSummary,
    ProjectUpdateType,
} from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/api-error';
import { pageArgs, toPagination } from '../lib/pagination';
import { isUniqueViolation, orConflict } from '../lib/prisma-errors';
import {
    assertProjectParty,
    completedProjectSelect,
    moveProjectStatus,
    projectSelect,
    projectUpdateSelect,
    projectViewSelect,
    providerCompletedProjectsWhere,
    toCompletedProject,
    toProject,
    toProjectDetail,
    toProjectSummary,
    toProjectUpdate,
} from '../lib/project';
import { reviewSelect, toReview } from '../lib/review';
import { parseBody, parseParams, parseQuery } from '../middleware/validate';
import { companyIdParamSchema } from '../schemas/company.schema';
import {
    completedProjectListQuerySchema,
    createProjectUpdateSchema,
    createReviewSchema,
    projectIdParamSchema,
    projectListQuerySchema,
    rejectWorkSchema,
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

// US4-9 (T4.9.3). One project, for its two parties. Anyone else gets 404
// from assertProjectParty, as if it did not exist.
export async function getProject(req: Request, res: Response): Promise<void> {
    const { projectId } = parseParams(projectIdParamSchema, req.params);
    const callerId = req.auth!.companyId;
    await assertProjectParty(projectId, callerId);

    const row = await prisma.project.findUnique({
        where: { projectId },
        select: projectViewSelect,
    });
    if (!row) throw ApiError.notFound('Project not found');
    res.json(toProjectDetail(row, callerId));
}

// US4-9 (T4.9.4). The progress timeline, oldest first, for both parties: the
// Provider's notes and the Receiver's rejected-work reasons (US4-12). A bare
// array, not paged: one project's timeline stays short.
export async function listProjectUpdates(
    req: Request,
    res: Response,
): Promise<void> {
    const { projectId } = parseParams(projectIdParamSchema, req.params);
    await assertProjectParty(projectId, req.auth!.companyId);

    const rows = await prisma.projectUpdate.findMany({
        where: { projectId },
        // The id breaks a tie between two updates saved in the same instant.
        orderBy: [{ createdAt: 'asc' }, { projectUpdateId: 'asc' }],
        select: projectUpdateSelect,
    });
    res.json(rows.map(toProjectUpdate));
}

// US4-10 (T4.10.1). The Provider adds a progress note while the work is
// IN_PROGRESS. The server sets the time (createdAt). No edit or delete: a
// correction is a new update.
export async function createProjectUpdate(
    req: Request,
    res: Response,
): Promise<void> {
    const { projectId } = parseParams(projectIdParamSchema, req.params);
    const { updateText } = parseBody(createProjectUpdateSchema, req.body);
    const project = await assertProjectParty(projectId, req.auth!.companyId);

    // A party already knows the project exists, so the Receiver gets 403, not 404.
    if (project.myRole !== 'provider') {
        throw ApiError.forbidden('Only the Provider can add a progress update');
    }
    if (project.projectStatus !== ('IN_PROGRESS' satisfies ProjectStatus)) {
        throw ApiError.conflict('Project is not IN_PROGRESS');
    }

    const row = await prisma.projectUpdate.create({
        data: {
            projectId,
            updateType: 'PROGRESS' satisfies ProjectUpdateType,
            updateText,
        },
        select: projectUpdateSelect,
    });
    res.status(201).json(toProjectUpdate(row));
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

// US4-11. The Provider reports the work complete: IN_PROGRESS to
// AWAITING_ACCEPTANCE, so the Receiver can accept or reject it (ADR 0015).
export async function submitWork(req: Request, res: Response): Promise<void> {
    const { projectId } = parseParams(projectIdParamSchema, req.params);
    const project = await assertProjectParty(projectId, req.auth!.companyId);

    if (project.myRole !== 'provider') {
        throw ApiError.forbidden(
            'Only the Provider can report the work complete',
        );
    }

    // A project not IN_PROGRESS, or a double click, is a 409 from the move.
    const row = await prisma.$transaction(async (tx) => {
        await moveProjectStatus(
            tx,
            projectId,
            'IN_PROGRESS',
            'AWAITING_ACCEPTANCE',
        );
        return tx.project.findUniqueOrThrow({
            where: { projectId },
            select: projectSelect,
        });
    });
    res.json(toProject(row));
}

// US4-12. The Receiver rejects the work with a reason: AWAITING_ACCEPTANCE
// back to IN_PROGRESS (ADR 0015). The reason is saved as a WORK_REJECTED
// update, so the Provider sees it in the progress timeline.
export async function rejectWork(req: Request, res: Response): Promise<void> {
    const { projectId } = parseParams(projectIdParamSchema, req.params);
    const { reason } = parseBody(rejectWorkSchema, req.body);
    const project = await assertProjectParty(projectId, req.auth!.companyId);

    if (project.myRole !== 'receiver') {
        throw ApiError.forbidden('Only the Receiver can reject the work');
    }

    // One transaction: the move and the reason are saved together or not at
    // all. A project not AWAITING_ACCEPTANCE, or a double click, is a 409.
    const row = await prisma.$transaction(async (tx) => {
        await moveProjectStatus(
            tx,
            projectId,
            'AWAITING_ACCEPTANCE',
            'IN_PROGRESS',
        );
        await tx.projectUpdate.create({
            data: {
                projectId,
                updateType: 'WORK_REJECTED' satisfies ProjectUpdateType,
                updateText: reason,
            },
        });
        return tx.project.findUniqueOrThrow({
            where: { projectId },
            select: projectSelect,
        });
    });
    res.json(toProject(row));
}

// US5-1. The Receiver reviews a completed project once (ADR 0018). Four 1-5 scores
// and an optional comment. A second review is 409. Outsiders get 404; Provider
// gets 403; project not COMPLETED gets 409.
export async function createReview(req: Request, res: Response): Promise<void> {
    const { projectId } = parseParams(projectIdParamSchema, req.params);
    const body = parseBody(createReviewSchema, req.body);
    const project = await assertProjectParty(projectId, req.auth!.companyId);

    if (project.myRole !== 'receiver') {
        throw ApiError.forbidden('Only the Receiver can review the project');
    }
    if (project.projectStatus !== ('COMPLETED' satisfies ProjectStatus)) {
        throw ApiError.conflict('Project is not COMPLETED');
    }

    try {
        const row = await prisma.review.create({
            data: {
                projectId,
                workQualityScore: body.workQualityScore,
                serviceScore: body.serviceScore,
                valueForMoneyScore: body.valueForMoneyScore,
                deliveryTimeScore: body.deliveryTimeScore,
                comment: body.comment ?? null,
            },
            select: reviewSelect,
        });

        res.status(201).json(toReview(row));
    } catch (err) {
        if (isUniqueViolation(err)) {
            throw ApiError.conflict('Project has already been reviewed');
        }
        throw err;
    }
}
// US5-3. The project's review, for both parties. 404 until the Receiver submits
// one. Outsiders get 404 (conventions §4).
export async function getProjectReview(
    req: Request,
    res: Response,
): Promise<void> {
    const { projectId } = parseParams(projectIdParamSchema, req.params);
    await assertProjectParty(projectId, req.auth!.companyId);

    const row = await prisma.review.findUnique({
        where: { projectId },
        select: reviewSelect,
    });
    if (!row) {
        throw ApiError.notFound('Review not found');
    }

    res.json(toReview(row));
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

    const where = providerCompletedProjectsWhere(companyId);

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
