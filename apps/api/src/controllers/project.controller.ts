import type { Request, Response } from 'express';
import type { ProjectStatus } from '@mangodb/shared';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/api-error';
import { isRecordNotFound } from '../lib/prisma-errors';
import { assertProjectParty, projectSelect, toProject } from '../lib/project';
import { parseParams } from '../middleware/validate';
import { projectIdParamSchema } from '../schemas/project.schema';

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
    // (P2025) and becomes a 409 instead of moving the time.
    try {
        const row = await prisma.project.update({
            where: {
                projectId,
                projectStatus: 'AWAITING_DEPOSIT' satisfies ProjectStatus,
                depositReportedAt: null,
            },
            data: { depositReportedAt: new Date() },
            select: projectSelect,
        });
        res.json(toProject(row));
    } catch (err) {
        if (isRecordNotFound(err)) {
            throw ApiError.conflict('Deposit has already been reported');
        }
        throw err;
    }
}
