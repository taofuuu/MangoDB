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
import { certificateSelect, toCertificate } from '../lib/certificate';
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

        return res.status(201).json({
            message: 'Certificate created successfully',
            certificate: toCertificate(certificate),
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
        where: { providerId },
        orderBy: { certificateId: 'desc' },
        select: certificateSelect,
    });
    return res.status(200).json(certificates.map(toCertificate));
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
            certificateId,
            providerId,
        },
        select: certificateSelect,
    });

    if (!existingCertificate) {
        throw ApiError.notFound('Certificate not found');
    }

    // Merge state for date validation
    const issueYear =
        body.issueYear !== undefined
            ? body.issueYear
            : existingCertificate.issueYear;
    const issueMonth =
        body.issueMonth !== undefined
            ? body.issueMonth
            : existingCertificate.issueMonth;
    const expireYear =
        body.expireYear !== undefined
            ? body.expireYear
            : existingCertificate.expireYear;
    const expireMonth =
        body.expireMonth !== undefined
            ? body.expireMonth
            : existingCertificate.expireMonth;

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
            where: { certificateId },
            data: {
                ...omitUndefined(body),
                ...(replacement ? { certImage: replacement.url } : {}),
            },
            select: certificateSelect,
        });
    } catch (error) {
        if (replacement) {
            await removeFromStorage(replacement.path, BUCKETS.CERTIFICATE);
        }

        throw error;
    }

    // The row points at the replacement now, so the old object is unreferenced.
    // Cleanup is best-effort, matching certificate deletion.
    if (replacement && existingCertificate.certImage) {
        await removeFromStorageByUrl(
            existingCertificate.certImage,
            BUCKETS.CERTIFICATE,
        );
    }

    return res.status(200).json({
        message: 'Certificate updated successfully',
        certificate: toCertificate(updatedCertificate),
    });
}

export async function deleteCertificate(req: Request, res: Response) {
    const providerId = Number(req.auth!.sub);
    const { certificateId } = parseParams(certificateIdParamSchema, req.params);

    const existingCertificate = await prisma.certificate.findFirst({
        where: {
            certificateId,
            providerId,
        },
        select: { certImage: true },
    });

    if (!existingCertificate) {
        throw ApiError.notFound('Certificate not found');
    }

    await prisma.certificate.delete({
        where: { certificateId },
    });

    // Best-effort cleanup: the row is gone either way.
    if (existingCertificate.certImage) {
        await removeFromStorageByUrl(
            existingCertificate.certImage,
            BUCKETS.CERTIFICATE,
        );
    }

    return res.status(204).end();
}
