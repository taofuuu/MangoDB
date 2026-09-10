import type { Request, Response } from 'express';

import { prisma } from '../lib/prisma';

import { parseBody } from '../middleware/validate';

import { createCertificateSchema } from '../schemas/certificate.schema';

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
