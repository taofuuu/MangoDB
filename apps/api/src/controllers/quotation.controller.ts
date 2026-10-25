import type { Request, Response } from 'express';
import type { ProjectStatus, QuotationStatus } from '@mangodb/shared';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/api-error';
import { isUniqueViolation, orConflict } from '../lib/prisma-errors';
import { assertProjectParty } from '../lib/project';
import {
    assertQuotationParty,
    quotationSelect,
    toQuotation,
} from '../lib/quotation';
import { BUCKETS, removeFromStorageByUrl } from '../lib/storage';
import { saveWithUpload } from '../lib/upload';
import { requireFile } from '../middleware/upload';
import { parseParams } from '../middleware/validate';
import { projectIdParamSchema } from '../schemas/project.schema';
import { quotationIdParamSchema } from '../schemas/quotation.schema';

// US4-1 (T4.1.3). The Provider uploads a quotation PDF on a project while it
// is AWAITING_QUOTATION and no quotation is pending (ADR 0017). The project
// stays AWAITING_QUOTATION until the Receiver accepts one (ADR 0015).
export async function createQuotation(
    req: Request,
    res: Response,
): Promise<void> {
    const { projectId } = parseParams(projectIdParamSchema, req.params);
    const file = requireFile(req.file, 'file', 'Choose a PDF first');
    const project = await assertProjectParty(projectId, req.auth!.companyId);

    // A party already knows the project exists, so the Receiver gets 403, not 404.
    if (project.myRole !== 'provider') {
        throw ApiError.forbidden('Only the Provider can upload a quotation');
    }
    if (
        project.projectStatus !== ('AWAITING_QUOTATION' satisfies ProjectStatus)
    ) {
        throw ApiError.conflict('Project is not AWAITING_QUOTATION');
    }

    // Checked before upload so a repeat attempt does not send a PDF to storage
    // only to delete it again. The partial unique index (ADR 0017) still
    // catches a concurrent second upload below, and saveWithUpload cleans up
    // the orphan file.
    const pending = await prisma.quotation.findFirst({
        where: {
            projectId,
            quotationStatus: 'PENDING' satisfies QuotationStatus,
        },
        select: { quotationId: true },
    });
    if (pending) {
        throw ApiError.conflict('A quotation is already pending');
    }

    let row;
    try {
        row = await saveWithUpload(
            file,
            BUCKETS.QUOTATION,
            'quotations',
            (quotationFile) =>
                prisma.quotation.create({
                    data: {
                        projectId,
                        quotationFile,
                        quotationStatus: 'PENDING' satisfies QuotationStatus,
                    },
                    select: quotationSelect,
                }),
        );
    } catch (err) {
        if (isUniqueViolation(err)) {
            throw ApiError.conflict('A quotation is already pending');
        }
        throw err;
    }

    res.status(201).json(toQuotation(row));
}

// US4-3 (T4.3.1). The project's quotations, newest first, for both parties:
// each with its file link and decision status (ADR 0017). A bare array, not
// paged: one project's quotation history stays short.
export async function listQuotations(
    req: Request,
    res: Response,
): Promise<void> {
    const { projectId } = parseParams(projectIdParamSchema, req.params);
    await assertProjectParty(projectId, req.auth!.companyId);

    const rows = await prisma.quotation.findMany({
        where: { projectId },
        // The id breaks a tie between two quotations saved in the same instant.
        orderBy: [{ createdAt: 'desc' }, { quotationId: 'desc' }],
        select: quotationSelect,
    });
    res.json(rows.map(toQuotation));
}

// US4-2 (T4.2.2). The Provider deletes a pending quotation so a wrong
// PDF can be replaced before the Receiver answers (ADR 0017). Deletes with
// where status = PENDING, so if the Receiver decides at the same moment, the
// delete answers 409 and keeps the decided PDF in storage.
export async function deleteQuotation(
    req: Request,
    res: Response,
): Promise<void> {
    const { quotationId } = parseParams(quotationIdParamSchema, req.params);
    const quotation = await assertQuotationParty(
        quotationId,
        req.auth!.companyId,
    );

    if (quotation.myRole !== 'provider') {
        throw ApiError.forbidden('Only the Provider can delete a quotation');
    }

    const deleted = await orConflict(
        prisma.quotation.delete({
            where: {
                quotationId,
                quotationStatus: 'PENDING' satisfies QuotationStatus,
            },
            select: { quotationFile: true },
        }),
        'Quotation is not PENDING',
    );

    // Best-effort cleanup of the PDF in storage once the row is gone.
    await removeFromStorageByUrl(deleted.quotationFile, BUCKETS.QUOTATION);

    res.status(204).end();
}
