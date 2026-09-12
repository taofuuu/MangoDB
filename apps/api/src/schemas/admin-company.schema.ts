import { z } from 'zod';
import { companyFields } from './company.schema';

// Keep pages bounded so one request cannot pull the full Company table into
// memory. The defaults also make GET /admin/companies useful without params.
export const companyAccountListQuerySchema = z.object({
    q: z.string().max(100).trim().optional(),
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

// written under time-crunch bypass — review later.
// US6-4. The admin's own password, same field changeCredentialsSchema takes,
// confirming intent before this endpoint's irreversible delete.
export const deleteCompanyAccountBodySchema = z.object({
    current_password: companyFields.passwordAttempt,
});

// US6-3's body schema is not here on purpose. The administrator edit accepts
// exactly the field set PATCH /companies/me does, so the controller imports
// updateCompanyProfileSchema from company.schema.ts. A copy here would be one
// more place to forget when a profile column is added, and a copy that only
// *nearly* matched would be worse than no copy at all.

export type CompanyAccountListQuery = z.infer<
    typeof companyAccountListQuerySchema
>;
