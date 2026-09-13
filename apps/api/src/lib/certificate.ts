import type { Certificate } from '@mangodb/shared';

// The columns a certificate response may carry, and the shape it ships in.
// Until this file existed the four certificate handlers returned raw Prisma
// rows, so any column added to the table would have shipped to the browser
// without anyone deciding to send it. Naming them makes the response a
// decision, the way every other resource here already works.

export const certificateSelect = {
    certificateId: true,
    providerId: true,
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

export interface CertificateRow extends Certificate {
    providerId: number;
}

// providerId is still on the wire only because it is on the wire today, and a
// rename commit is not the place to remove a field. Phase 4 drops it and this
// type becomes a plain Certificate: it tells the browser nothing it did not
// already know, since a provider can only ever read its own certificates.
export type CertificateResponse = Certificate & { providerId: number };

export function toCertificate(row: CertificateRow): CertificateResponse {
    return {
        certificateId: row.certificateId,
        providerId: row.providerId,
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
