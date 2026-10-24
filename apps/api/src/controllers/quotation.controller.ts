import type { Request, Response } from 'express';
import type { ProjectStatus, QuotationStatus } from '@mangodb/shared';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/api-error';
import { isUniqueViolation } from '../lib/prisma-errors';
import { assertProjectParty } from '../lib/project';
import { quotationSelect, toQuotation } from '../lib/quotation';
import { BUCKETS } from '../lib/storage';
import { saveWithUpload } from '../lib/upload';
import { requirePdf } from '../middleware/upload';
import { parseParams } from '../middleware/validate';
import { projectIdParamSchema } from '../schemas/project.schema';

// US4-1 (T4.1.3). The Provider uploads a quotation PDF on a project while it
// is AWAITING_QUOTATION and no quotation is pending (ADR 0017). The project
// stays AWAITING_QUOTATION until the Receiver accepts one (ADR 0015).
export async function createQuotation(
    req: Request,
    res: Response,
): Promise<void> {
    const { projectId } = parseParams(projectIdParamSchema, req.params);
    const file = requirePdf(req.file, 'file');
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
