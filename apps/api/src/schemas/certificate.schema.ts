import { z } from 'zod';
import { httpUrl } from './common.schema';

export const certificateIdParamSchema = z.object({
    certificateId: z.coerce.number().int().positive().max(2147483647),
});

// A floor on typos, not a real rule: certificates predate the platform, but a
// year below this is far more likely a mistyped digit than a real issue date.
const EARLIEST_CERT_YEAR = 1990;

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
            .max(new Date().getFullYear(), 'Issue year cannot be in the future')
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
            .nullable()
            .optional(),
    ),
    credentialId: emptyToNull(z.string().trim().max(255).nullable().optional()),
    // httpUrl, not z.url(): the certificate page renders this as an href, and
    // z.url() accepts javascript: — stored XSS the moment someone clicks it.
    credentialUrl: emptyToNull(httpUrl.nullable().optional()),
} as const;

export const createCertificateSchema = z.object(certificateFields).refine(
    (data) => {
        if (
            data.issueYear == null ||
            data.issueMonth == null ||
            data.expireYear == null ||
            data.expireMonth == null
        ) {
            return true;
        }
        const issueDate = data.issueYear * 100 + data.issueMonth;
        const expireDate = data.expireYear * 100 + data.expireMonth;
        return expireDate >= issueDate;
    },
    {
        message: 'Expiration date cannot be before the issue date',
        path: ['expireYear'],
    },
);

// All fields optional for partial PATCH operations
export const updateCertificateSchema = z.object(certificateFields).partial();

export type UpdateCertificateInput = z.infer<typeof updateCertificateSchema>;
