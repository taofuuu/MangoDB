import { z } from 'zod';

export const certificateFields = {
    cert_title: z.string().trim().max(255),

    organization: z.string().trim().max(255),

    issue_month: z.number().int().min(1).max(12).nullable().optional(),

    issue_year: z
        .number()
        .int()
        .min(1990)
        .max(new Date().getFullYear())
        .nullable()
        .optional(),

    expire_month: z.number().int().min(1).max(12).nullable().optional(),

    expire_year: z
        .number()
        .int()
        .min(new Date().getFullYear())
        .nullable()
        .optional(),

    credential_id: z.string().trim().max(255),

    credential_url: z.url(),

    cert_image: z.string().trim().max(255),
} as const;

export const addCertificateSchema = z.object(certificateFields);
