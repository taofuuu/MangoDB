import { z } from 'zod';
import { int4Id, pageQueryFields } from './common.schema';
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
    ...pageQueryFields,
});

export const companyAccountIdParamSchema = z.object({
    companyId: int4Id,
});

// US6-4. The caller's own password, same field changeCredentialsSchema takes,
// confirming intent before an irreversible delete. The admin delete and a
// company's own DELETE /companies/me both take this body.
export const deleteCompanyAccountBodySchema = z.object({
    currentPassword: companyFields.passwordAttempt,
});

// US6-3's body schema is not here on purpose. The administrator edit accepts
// exactly the field set PATCH /companies/me does, so the controller imports
// updateCompanyProfileSchema from company.schema.ts. A copy here would be one
// more place to forget when a profile column is added, and a copy that only
// *nearly* matched would be worse than no copy at all.
