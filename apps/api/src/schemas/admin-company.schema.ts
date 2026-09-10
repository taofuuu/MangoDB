import { z } from 'zod';

// Keep pages bounded so one request cannot pull the full Company table into
// memory. The defaults also make GET /admin/companies useful without params.
export const companyAccountListQuerySchema = z.object({
    q: z.string().trim().optional(),
    filter: z.enum(['PROVIDER', 'RECEIVER', 'BOTH', 'ADMIN']).optional(),
    includeDeleted: z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => v === 'true'),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const companyAccountIdParamSchema = z.object({
    companyId: z.coerce.number().int().positive(),
});

export type CompanyAccountListQuery = z.infer<
    typeof companyAccountListQuerySchema
>;
