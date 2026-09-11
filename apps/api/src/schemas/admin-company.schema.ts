import { z } from 'zod';

// Keep pages bounded so one request cannot pull the full Company table into
// memory. The defaults also make GET /admin/companies useful without params.
export const companyAccountListQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const companyAccountIdParamSchema = z.object({
    companyId: z.coerce.number().int().positive(),
});

// US6-3's body schema is not here on purpose. The administrator edit accepts
// exactly the field set PATCH /companies/me does, so the controller imports
// updateCompanyProfileSchema from company.schema.ts. A copy here would be one
// more place to forget when a profile column is added, and a copy that only
// *nearly* matched would be worse than no copy at all.

export type CompanyAccountListQuery = z.infer<
    typeof companyAccountListQuerySchema
>;
