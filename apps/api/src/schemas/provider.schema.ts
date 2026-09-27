import { z } from 'zod';

// US3-1. Same paging bounds as GET /admin/companies, so one request cannot
// pull every Provider into memory. Keyword, filter and sort params come later.
export const providerListQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
