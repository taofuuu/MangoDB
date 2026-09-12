import type { Request, Response } from 'express';

import { prisma } from '../lib/prisma';

import { parseBody, parseParams } from '../middleware/validate';

import {
    certificateIdParamSchema,
    createCertificateSchema,
    updateCertificateSchema,
} from '../schemas/certificate.schema';

import {
    uploadToStorage,
    removeFromStorage,
    removeFromStorageByUrl,
    BUCKETS,
} from '../lib/storage';
import { ApiError } from '../lib/ApiError';
import { omitUndefined } from '../lib/objects';

export async function createCertificate(req: Request, res: Response) {
    const providerId = Number(req.auth!.sub);

    const body = parseBody(createCertificateSchema, req.body);

    let certImage: string | null = null;
    let certImagePath: string | null = null;

    // Upload certificate image if one was provided
    if (req.file) {
        const uploaded = await uploadToStorage(
            req.file,
            BUCKETS.CERTIFICATE,
            'certificates',
        );

        certImage = uploaded.url;
        certImagePath = uploaded.path;
    }

    try {
        const certificate = await prisma.certificate.create({
            data: {
                provider_id: providerId,

                cert_title: body.cert_title,
                organization: body.organization,

                issue_month: body.issue_month ?? null,
                issue_year: body.issue_year ?? null,

                expire_month: body.expire_month ?? null,
                expire_year: body.expire_year ?? null,

                credential_id: body.credential_id ?? null,
                credential_url: body.credential_url ?? null,

                cert_image: certImage,
            },
        });

        return res.status(201).json({
            message: 'Certificate created successfully',
            certificate,
        });
    } catch (error) {
        // Database creation failed, so remove the uploaded file
        if (certImagePath) {
            await removeFromStorage(certImagePath, BUCKETS.CERTIFICATE);
        }

        throw error;
    }
}

export async function getCertificatesByProvider(req: Request, res: Response) {
    const providerId = Number(req.auth!.sub);
    const certificates = await prisma.certificate.findMany({
        where: { provider_id: providerId },
        orderBy: { certificate_id: 'desc' },
    });
    return res.status(200).json(certificates);
}

export async function updateCertificate(req: Request, res: Response) {
    const providerId = Number(req.auth!.sub);
    const { certificateId } = parseParams(certificateIdParamSchema, req.params);

    const body = parseBody(updateCertificateSchema, req.body);

    // The text body may be empty when the only change is a replacement image.
    if (Object.keys(body).length === 0 && !req.file) {
        throw ApiError.badRequest('Provide at least one field to update');
    }

    // Fetch existing certificate for ownership and date merging
    const existingCertificate = await prisma.certificate.findFirst({
        where: {
            certificate_id: certificateId,
            provider_id: providerId,
        },
    });

    if (!existingCertificate) {
        throw ApiError.notFound('Certificate not found');
    }

    // Merge state for date validation
    const issueYear =
        body.issue_year !== undefined
            ? body.issue_year
            : existingCertificate.issue_year;
    const issueMonth =
        body.issue_month !== undefined
            ? body.issue_month
            : existingCertificate.issue_month;
    const expireYear =
        body.expire_year !== undefined
            ? body.expire_year
            : existingCertificate.expire_year;
    const expireMonth =
        body.expire_month !== undefined
            ? body.expire_month
            : existingCertificate.expire_month;

    if (
        issueYear != null &&
        issueMonth != null &&
        expireYear != null &&
        expireMonth != null
    ) {
        const issueDate = issueYear * 100 + issueMonth;
        const expireDate = expireYear * 100 + expireMonth;

        if (expireDate < issueDate) {
            throw ApiError.badRequest(
                'Expiration date cannot be before the issue date',
            );
        }
    }

    // Multer keeps the file in memory; storage is not touched until ownership
    // and the dates are known good. If the update later fails, this is removed.
    const replacement = req.file
        ? await uploadToStorage(req.file, BUCKETS.CERTIFICATE, 'certificates')
        : null;

    let updatedCertificate;
    try {
        updatedCertificate = await prisma.certificate.update({
            where: { certificate_id: certificateId },
            data: {
                ...omitUndefined(body),
                ...(replacement ? { cert_image: replacement.url } : {}),
            },
        });
    } catch (error) {
        if (replacement) {
            await removeFromStorage(replacement.path, BUCKETS.CERTIFICATE);
        }

        throw error;
    }

    // The row points at the replacement now, so the old object is unreferenced.
    // Cleanup is best-effort, matching certificate deletion.
    if (replacement && existingCertificate.cert_image) {
        await removeFromStorageByUrl(
            existingCertificate.cert_image,
            BUCKETS.CERTIFICATE,
        );
    }

    return res.status(200).json({
        message: 'Certificate updated successfully',
        certificate: updatedCertificate,
    });
}

export async function deleteCertificate(req: Request, res: Response) {
    const providerId = Number(req.auth!.sub);
    const { certificateId } = parseParams(certificateIdParamSchema, req.params);

    const existingCertificate = await prisma.certificate.findFirst({
        where: {
            certificate_id: certificateId,
            provider_id: providerId,
        },
    });

    if (!existingCertificate) {
        throw ApiError.notFound('Certificate not found');
    }

    await prisma.certificate.delete({
        where: { certificate_id: certificateId },
    });

    // Best-effort cleanup: the row is gone either way.
    if (existingCertificate.cert_image) {
        await removeFromStorageByUrl(
            existingCertificate.cert_image,
            BUCKETS.CERTIFICATE,
        );
    }

    return res.status(204).end();
}
