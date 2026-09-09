import { z } from 'zod';

export const certificateFields = {
    cert_title: z.string().trim().max(255),

    organization: z.string().trim().max(255),

    issue_month: z.number().int().min(1).max(12).nullable().optional(),

    issue_year: z
        .number()
        .int()
        .min(1990, 'Issue year must be 1990 or later')
        .max(new Date().getFullYear(), 'Issue year cannot be in the future')
        .nullable()
        .optional(),

    expire_month: z.number().int().min(1).max(12).nullable().optional(),

    expire_year: z
        .number()
        .int()
        .min(
            new Date().getFullYear(),
            'Expiration year cannot be before the current year',
        )
        .nullable()
        .optional(),

    credential_id: z.string().trim().max(255).nullable().optional(),

    credential_url: z.url().nullable().optional(),

    cert_image: z.string().trim().max(255).nullable().optional(),
} as const;

export const addCertificateSchema = z.object(certificateFields).refine(
    (data) => {
        // If either date is not provided, don't validate the comparison
        if (
            data.issue_year == null ||
            data.issue_month == null ||
            data.expire_year == null ||
            data.expire_month == null
        ) {
            return true;
        }

        // Convert the dates to YYYYMM for easy comparison
        const issueDate = data.issue_year * 100 + data.issue_month;
        const expireDate = data.expire_year * 100 + data.expire_month;

        return expireDate >= issueDate;
    },
    {
        message: 'Expiration date cannot be before the issue date',
        path: ['expire_year'],
    },
);
