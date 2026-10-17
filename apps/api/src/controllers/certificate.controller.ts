import type { Request, Response } from 'express';

import { prisma } from '../lib/prisma';

import { parseBody, parseParams, parseQuery } from '../middleware/validate';

import {
    EXPIRY_BEFORE_ISSUE,
    certificateIdParamSchema,
    certificateListQuerySchema,
    createCertificateSchema,
    expiryIsOnOrAfterIssue,
    updateCertificateSchema,
} from '../schemas/certificate.schema';

import { removeFromStorageByUrl, BUCKETS } from '../lib/storage';
import { saveWithUpload } from '../lib/upload';
import { ApiError } from '../lib/api-error';
import {
    assertCertificateOwned,
    certificateSelect,
    toCertificate,
} from '../lib/certificate';
import { omitUndefined } from '../lib/objects';

export async function createCertificate(
    req: Request,
    res: Response,
): Promise<void> {
    const providerId = req.auth!.companyId;

    const body = parseBody(createCertificateSchema, req.body);

    // The image is optional. With one, saveWithUpload removes it again if
    // the row cannot be created.
    const save = (certImage: string | null) =>
        prisma.certificate.create({
            data: {
                providerId,

                certTitle: body.certTitle,
                organization: body.organization,

                issueMonth: body.issueMonth ?? null,
                issueYear: body.issueYear ?? null,

                expireMonth: body.expireMonth ?? null,
                expireYear: body.expireYear ?? null,

                credentialId: body.credentialId ?? null,
                credentialUrl: body.credentialUrl ?? null,

                certImage,
            },
            select: certificateSelect,
        });

    const certificate = req.file
        ? await saveWithUpload(
              req.file,
              BUCKETS.CERTIFICATE,
              'certificates',
              save,
          )
        : await save(null);

    res.status(201).json(toCertificate(certificate));
}

export async function listMyCertificates(
    req: Request,
    res: Response,
): Promise<void> {
    const providerId = req.auth!.companyId;
    const certificates = await prisma.certificate.findMany({
        where: { providerId },
        orderBy: { certificateId: 'desc' },
        select: certificateSelect,
    });
    res.json(certificates.map(toCertificate));
}

// Another company's certificates, for its profile page. A company that is
// unknown, deleted, or not a provider has none to show, so each is an empty
// list rather than a 404, the way ?companyId= on GET /services answers. A
// deleted company's rows are still in the table, hence the deletedAt filter.
export async function listCompanyCertificates(
    req: Request,
    res: Response,
): Promise<void> {
    const { companyId } = parseQuery(certificateListQuerySchema, req.query);
    const certificates = await prisma.certificate.findMany({
        where: {
            providerId: companyId,
            provider: { company: { deletedAt: null } },
        },
        orderBy: { certificateId: 'desc' },
        select: certificateSelect,
    });
    res.json(certificates.map(toCertificate));
}

export async function updateCertificate(
    req: Request,
    res: Response,
): Promise<void> {
    const providerId = req.auth!.companyId;
    const { certificateId } = parseParams(certificateIdParamSchema, req.params);

    const body = parseBody(updateCertificateSchema, req.body);

    // The text body may be empty when the only change is a replacement image.
    if (Object.keys(body).length === 0 && !req.file) {
        throw ApiError.badRequest('Provide at least one field to update');
    }

    // Read before any write, for the ownership check and for the dates the
    // rule below needs — a PATCH may send one half of a date pair, so the rule
    // only means anything against the merged state.
    const existing = await assertCertificateOwned(certificateId, providerId);

    if (!expiryIsOnOrAfterIssue({ ...existing, ...omitUndefined(body) })) {
        throw ApiError.badRequest(EXPIRY_BEFORE_ISSUE);
    }

    // Multer keeps the file in memory; storage is not touched until ownership
    // and the dates are known good. A replacement image takes the old one's
    // place, and saveWithUpload removes whichever file ends up unreferenced.
    const save = (certImage?: string) =>
        prisma.certificate.update({
            where: { certificateId },
            data: {
                ...omitUndefined(body),
                ...(certImage ? { certImage } : {}),
            },
            select: certificateSelect,
        });

    const updatedCertificate = req.file
        ? await saveWithUpload(
              req.file,
              BUCKETS.CERTIFICATE,
              'certificates',
              save,
              existing.certImage,
          )
        : await save();

    res.json(toCertificate(updatedCertificate));
}

export async function deleteCertificate(
    req: Request,
    res: Response,
): Promise<void> {
    const providerId = req.auth!.companyId;
    const { certificateId } = parseParams(certificateIdParamSchema, req.params);

    const { certImage } = await assertCertificateOwned(
        certificateId,
        providerId,
    );

    await prisma.certificate.delete({ where: { certificateId } });

    // Best-effort cleanup: the row is gone either way.
    if (certImage) {
        await removeFromStorageByUrl(certImage, BUCKETS.CERTIFICATE);
    }

    res.status(204).end();
}
