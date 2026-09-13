// The columns a certificate response may carry, and the shape it ships in.
// Until this file existed the four certificate handlers returned raw Prisma
// rows, so any column added to the table would have shipped to the browser
// without anyone deciding to send it. Naming them makes the response a
// decision, the way every other resource here already works.
//
// providerId is on the list only because it is on the wire today and this
// commit is not allowed to change the wire. Phase 4 takes it off: it tells the
// browser nothing it did not already know, since a provider can only read its
// own certificates.

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

export interface CertificateRow {
    certificateId: number;
    providerId: number;
    certTitle: string;
    certImage: string | null;
    credentialId: string | null;
    credentialUrl: string | null;
    expireMonth: number | null;
    expireYear: number | null;
    issueMonth: number | null;
    issueYear: number | null;
    organization: string;
}

export interface CertificateResponse {
    certificate_id: number;
    provider_id: number;
    cert_title: string;
    cert_image: string | null;
    credential_id: string | null;
    credential_url: string | null;
    expire_month: number | null;
    expire_year: number | null;
    issue_month: number | null;
    issue_year: number | null;
    organization: string;
}

export function toCertificate(row: CertificateRow): CertificateResponse {
    return {
        certificate_id: row.certificateId,
        provider_id: row.providerId,
        cert_title: row.certTitle,
        cert_image: row.certImage,
        credential_id: row.credentialId,
        credential_url: row.credentialUrl,
        expire_month: row.expireMonth,
        expire_year: row.expireYear,
        issue_month: row.issueMonth,
        issue_year: row.issueYear,
        organization: row.organization,
    };
}
