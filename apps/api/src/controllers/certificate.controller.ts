import type { Request, Response } from 'express';

import { prisma } from '../lib/prisma';

import { parseBody } from '../middleware/validate';

import { addCertificateSchema } from '../schemas/certificate.schema';

export async function addCertificate(req: Request, res: Response) {
    const providerId = Number(req.auth!.sub);

    const body = parseBody(addCertificateSchema, req.body);

    const certificate = await prisma.certificate.create({
        data: {
            provider_id: providerId,

            cert_title: body.cert_title,
            organization: body.organization,

            issue_month: body.issue_month ?? null,
            issue_year: body.issue_year ?? null,

            expire_month: body.expire_month ?? null,
            expire_year: body.expire_year ?? null,

            credential_id: body.credential_id,
            credential_url: body.credential_url,

            cert_image: body.cert_image,
        },
    });

    return res.status(201).json({
        message: 'Certificate created successfully',
        certificate,
    });
}
