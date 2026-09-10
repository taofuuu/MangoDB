// import type { Request, Response } from 'express';

// import { prisma } from '../lib/prisma';

// import { parseBody } from '../middleware/validate';

// import { addCertificateSchema } from '../schemas/certificate.schema';

// export async function addCertificate(
//     req: Request,
//     res: Response
// ) {
//     const providerId = Number(req.auth!.sub);
//     const body = parseBody(addCertificateSchema, req.body);
//     const certificate = await prisma.certificate.create({
//         data: {
//             provider_id: providerId,

//             cert_title: body.cert_title,
//             organization: body.organization,

//             issue_month: body.issue_month ?? null,
//             issue_year: body.issue_year ?? null,

//             expire_month: body.expire_month ?? null,
//             expire_year: body.expire_year ?? null,

//             credential_id: body.credential_id ?? null,
//             credential_url: body.credential_url ?? null,

//             cert_image: body.cert_image ?? null,
//         },
//     });

//     return res.status(201).json({
//         message: 'Certificate created successfully',
//         certificate,
//     });
// }

// export async function updateCertificate(
//     req: Request,
//     res: Response
// ) {
//     const providerId = Number(req.auth!.sub);
//     const certificateId = Number(req.params.id);

//     // Parse and validate optional fields for update
//     const body = parseBody(updateCertificateSchema, req.body);

//     // Verify ownership before updating
//     const existingCertificate = await prisma.certificate.findFirst({
//         where: {
//             id: certificateId,
//             provider_id: providerId,
//         },
//     });

//     if (!existingCertificate) {
//         return res.status(404).json({ message: 'Certificate not found' });
//     }

//     const updatedCertificate = await prisma.certificate.update({
//         where: { id: certificateId },
//         data: {
//             cert_title: body.cert_title,
//             organization: body.organization,
//             issue_month: body.issue_month,
//             issue_year: body.issue_year,
//             expire_month: body.expire_month,
//             expire_year: body.expire_year,
//             credential_id: body.credential_id,
//             credential_url: body.credential_url,
//             cert_image: body.cert_image,
//         },
//     });

//     return res.status(200).json({
//         message: 'Certificate updated successfully',
//         certificate: updatedCertificate,
//     });
// }

// export async function deleteCertificate(req: Request, res: Response) {
//     const providerId = Number(req.auth!.sub);
//     const certificateId = Number(req.params.id);

//     // Verify ownership before deleting
//     const existingCertificate = await prisma.certificate.findFirst({
//         where: {
//             id: certificateId,
//             provider_id: providerId,
//         },
//     });

//     if (!existingCertificate) {
//         return res.status(404).json({ message: 'Certificate not found' });
//     }

//     await prisma.certificate.delete({
//         where: { id: certificateId },
//     });

//     return res.status(200).json({
//         message: 'Certificate deleted successfully',
//     });
// }

import type { Request, Response } from 'express';

import { prisma } from '../lib/prisma';

import { parseBody } from '../middleware/validate';

import {
    addCertificateSchema,
    updateCertificateSchema,
} from '../schemas/certificate.schema';

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

            credential_id: body.credential_id ?? null,
            credential_url: body.credential_url ?? null,

            cert_image: body.cert_image ?? null,
        },
    });

    return res.status(201).json({
        message: 'Certificate created successfully',
        certificate,
    });
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
        data: body,
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
