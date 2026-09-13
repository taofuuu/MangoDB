import { z } from 'zod';
import { httpUrl } from './common.schema';

export const certificateIdParamSchema = z.object({
    certificateId: z.coerce.number().int().positive().max(2147483647),
});

// A floor on typos, not a real rule: certificates predate the platform, but a
// year below this is far more likely a mistyped digit than a real issue date.
const EARLIEST_CERT_YEAR = 1990;

// How far ahead an expiry may sit.
const MAX_YEARS_AHEAD = 50;

// A function, not a constant. Evaluated at module load, `new Date()` freezes
// the year the process started, so a server left running over New Year starts
// rejecting certificates issued in January.
function currentYear(): number {
    return new Date().getFullYear();
}

// Both forms post multipart because they carry the image, so every field
// arrives as a string and a cleared input arrives as ''. Without this,
// z.coerce.number() reads '' as 0 and a cleared month is stored as month zero.
const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
    z.preprocess((value) => (value === '' ? null : value), schema);

export const certificateFields = {
    certTitle: z.string().trim().max(255),
    organization: z.string().trim().max(255),

    issueMonth: emptyToNull(
        z.coerce.number().int().min(1).max(12).nullable().optional(),
    ),
    issueYear: emptyToNull(
        z.coerce
            .number()
            .int()
            .min(
                EARLIEST_CERT_YEAR,
                `Issue year must be ${EARLIEST_CERT_YEAR} or later`,
            )
            .max(currentYear(), 'Issue year cannot be in the future')
            .nullable()
            .optional(),
    ),
    expireMonth: emptyToNull(
        z.coerce.number().int().min(1).max(12).nullable().optional(),
    ),
    expireYear: emptyToNull(
        z.coerce
            .number()
            .int()
            .min(
                EARLIEST_CERT_YEAR,
                `Expiration year must be ${EARLIEST_CERT_YEAR} or later`,
            )
            // An expiry may be in the future — that is what an expiry is — but
            // not by a century. Without a ceiling this accepted 999999.
            .max(
                currentYear() + MAX_YEARS_AHEAD,
                `Expiration year cannot be more than ${MAX_YEARS_AHEAD} years away`,
            )
            .nullable()
            .optional(),
    ),
    credentialId: emptyToNull(z.string().trim().max(255).nullable().optional()),
    // httpUrl, not z.url(): the certificate page renders this as an href, and
    // z.url() accepts javascript: — stored XSS the moment someone clicks it.
    credentialUrl: emptyToNull(httpUrl.nullable().optional()),
} as const;

// The one place the expiry-vs-issue rule is written. PATCH cannot use the
// .refine() below, because .partial() drops refinements and a partial body has
// to be merged with the stored row before the rule means anything — so the
// controller calls this with the merged values instead of hand-rolling the
// comparison a second time.
export const EXPIRY_BEFORE_ISSUE =
    'Expiration date cannot be before the issue date';

export interface CertificateDates {
    issueMonth?: number | null | undefined;
    issueYear?: number | null | undefined;
    expireMonth?: number | null | undefined;
    expireYear?: number | null | undefined;
}

// A half-filled date says nothing about ordering, so it passes. Comparing
// year * 100 + month puts the two dates on one number line.
export function expiryIsOnOrAfterIssue(dates: CertificateDates): boolean {
    const { issueYear, issueMonth, expireYear, expireMonth } = dates;

    if (
        issueYear == null ||
        issueMonth == null ||
        expireYear == null ||
        expireMonth == null
    ) {
        return true;
    }

    return expireYear * 100 + expireMonth >= issueYear * 100 + issueMonth;
}

export const createCertificateSchema = z
    .object(certificateFields)
    .refine(expiryIsOnOrAfterIssue, {
        message: EXPIRY_BEFORE_ISSUE,
        path: ['expireYear'],
    });

// All fields optional for partial PATCH operations. strictObject for the same
// reason updateCompanyProfileSchema uses it: a plain object silently drops a
// misspelled key and answers 200 having written nothing.
export const updateCertificateSchema = z
    .strictObject(certificateFields)
    .partial();
