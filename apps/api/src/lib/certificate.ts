import type { Certificate } from '@mangodb/shared';
import { ApiError } from './api-error';
import { prisma } from './prisma';
import type { Prisma } from '../generated/prisma/client';

// The columns a certificate response may carry, and the shape it ships in.
// Until this file existed the four certificate handlers returned raw Prisma
// rows, so any column added to the table would have shipped to the browser
// without anyone deciding to send it. Naming them makes the response a
// decision, the way every other resource here already works.

export const certificateSelect = {
    certificateId: true,
    certTitle: true,
    certImage: true,
    credentialId: true,
    credentialUrl: true,
    expireMonth: true,
    expireYear: true,
    issueMonth: true,
    issueYear: true,
    organization: true,
} as const satisfies Prisma.CertificateSelect;

// The row and the response are the same shape now: the select names exactly
// the columns the shared type declares, so there is nothing left to map.
// toCertificate stays as the one place that would change if they diverge.
export type CertificateRow = Certificate;
export type CertificateResponse = Certificate;

// The ownership check both the update and the delete handler need, written
// once. Another provider's certificate answers 404, not 403. Since
// GET /certificates?companyId=, its ids are discoverable, so by
// docs/adding-a-resource.md the two could be split like assertPortfolioOwned.
// The 404 is kept: it leaks nothing, and the frontend already handles it.
export async function assertCertificateOwned(
    certificateId: number,
    providerId: number,
): Promise<CertificateRow> {
    const certificate = await prisma.certificate.findFirst({
        where: { certificateId, providerId },
        select: certificateSelect,
    });

    if (!certificate) {
        throw ApiError.notFound('Certificate not found');
    }

    return certificate;
}

export function toCertificate(row: CertificateRow): CertificateResponse {
    return {
        certificateId: row.certificateId,
        certTitle: row.certTitle,
        certImage: row.certImage,
        credentialId: row.credentialId,
        credentialUrl: row.credentialUrl,
        expireMonth: row.expireMonth,
        expireYear: row.expireYear,
        issueMonth: row.issueMonth,
        issueYear: row.issueYear,
        organization: row.organization,
    };
}
