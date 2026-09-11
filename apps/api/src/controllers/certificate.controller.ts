import type { Request, Response } from 'express';

import { prisma } from '../lib/prisma';

import { parseBody } from '../middleware/validate';

import {
    createCertificateSchema,
    updateCertificateSchema,
    UpdateCertificateInput,
} from '../schemas/certificate.schema';

import { uploadToStorage, removeFromStorage, BUCKETS } from '../lib/storage';

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

export async function updateCertificate(req: Request, res: Response) {
    const providerId = Number(req.auth!.sub);
    const certificateId = Number(req.params.certificateId);

    const body: UpdateCertificateInput = parseBody(
        updateCertificateSchema,
        req.body,
    );

    // Fetch existing certificate for ownership and date merging
    const existingCertificate = await prisma.certificate.findFirst({
        where: {
            certificate_id: certificateId,
            provider_id: providerId,
        },
    });

    if (!existingCertificate) {
        return res.status(404).json({ message: 'Certificate not found' });
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
            return res.status(400).json({
                message: 'Expiration date cannot be before the issue date',
            });
        }
    }

    const updatedCertificate = await prisma.certificate.update({
        where: { certificate_id: certificateId },
        data: {
            ...(body.cert_title !== undefined && {
                cert_title: body.cert_title,
            }),
            ...(body.organization !== undefined && {
                organization: body.organization,
            }),
            ...(body.issue_month !== undefined && {
                issue_month: body.issue_month,
            }),
            ...(body.issue_year !== undefined && {
                issue_year: body.issue_year,
            }),
            ...(body.expire_month !== undefined && {
                expire_month: body.expire_month,
            }),
            ...(body.expire_year !== undefined && {
                expire_year: body.expire_year,
            }),
            ...(body.credential_id !== undefined && {
                credential_id: body.credential_id,
            }),
            ...(body.credential_url !== undefined && {
                credential_url: body.credential_url,
            }),
            ...(body.cert_image !== undefined && {
                cert_image: body.cert_image,
            }),
        },
    });

    return res.status(200).json({
        message: 'Certificate updated successfully',
        certificate: updatedCertificate,
    });
}

export async function deleteCertificate(req: Request, res: Response) {
    const providerId = Number(req.auth!.sub);
    const certificateId = Number(req.params.certificateId);

    const existingCertificate = await prisma.certificate.findFirst({
        where: {
            certificate_id: certificateId,
            provider_id: providerId,
        },
    });

    if (!existingCertificate) {
        return res.status(404).json({ message: 'Certificate not found' });
    }

    await prisma.certificate.delete({
        where: { certificate_id: certificateId },
    });

    return res.status(200).json({
        message: 'Certificate deleted successfully',
    });
}
