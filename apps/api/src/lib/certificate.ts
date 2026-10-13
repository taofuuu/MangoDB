import type { Certificate } from '@mangodb/shared';
import { ApiError } from './ApiError';
import { prisma } from './prisma';

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
} as const;

// The row and the response are the same shape now: the select names exactly
// the columns the shared type declares, so there is nothing left to map.
// toCertificate stays as the one place that would change if they diverge.
export type CertificateRow = Certificate;
export type CertificateResponse = Certificate;

// The ownership check both the update and the delete handler need, written
// once. It was inlined twice, byte-identical, and both copies folded 403 into
// 404 by matching on providerId in the same query — so another provider's
// certificate reported "not found". That is the right answer here and the
// wrong one in general (see assertPortfolioOwned, which separates them), so
// the reason is written down rather than left to be re-derived:
//
// a provider cannot discover another provider's certificate ids, so there is
// no id it could have got except by guessing. Confirming a guess is the only
// thing a 403 would add.
//
// That premise no longer holds: GET /certificates?companyId= lists another
// provider's certificates, ids included. The 404 is kept because it is still
// safe and the frontend already handles it, but by the rule in
// docs/adding-a-resource.md these ids are now discoverable, so 404 and 403
// could be split like assertPortfolioOwned.
export async function assertCertificateOwned(
    certificateId: number,
    providerId: number,
): Promise<{ certImage: string | null }> {
    const certificate = await prisma.certificate.findFirst({
        where: { certificateId, providerId },
        select: { certImage: true },
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
