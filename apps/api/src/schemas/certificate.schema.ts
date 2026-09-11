import { z } from 'zod';

export const certificateFields = {
    cert_title: z.string().trim().max(255),
    organization: z.string().trim().max(255),

    issue_month: z.coerce.number().int().min(1).max(12).nullable().optional(),
    issue_year: z.coerce
        .number()
        .int()
        .min(1990, 'Issue year must be 1990 or later')
        .max(new Date().getFullYear(), 'Issue year cannot be in the future')
        .nullable()
        .optional(),
    expire_month: z.coerce.number().int().min(1).max(12).nullable().optional(),
    expire_year: z.coerce
        .number()
        .int()
        .min(1990, 'Expiration year must be 1990 or later')
        .nullable()
        .optional(),
    credential_id: z.string().trim().max(255).nullable().optional(),
    credential_url: z.url().nullable().optional(),
    cert_image: z.string().trim().max(255).nullable().optional(),
} as const;

export const createCertificateSchema = z.object(certificateFields).refine(
    (data) => {
        if (
            data.issue_year == null ||
            data.issue_month == null ||
            data.expire_year == null ||
            data.expire_month == null
        ) {
            return true;
        }
        const issueDate = data.issue_year * 100 + data.issue_month;
        const expireDate = data.expire_year * 100 + data.expire_month;
        return expireDate >= issueDate;
    },
    {
        message: 'Expiration date cannot be before the issue date',
        path: ['expire_year'],
    },
);

// All fields optional for partial PATCH operations
export const updateCertificateSchema = z.object(certificateFields).partial();

export type UpdateCertificateInput = z.infer<typeof updateCertificateSchema>;
