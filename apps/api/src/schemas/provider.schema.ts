import { z } from 'zod';

// US3-1. Same paging bounds as GET /admin/companies, so one request cannot
// pull every Provider into memory. Filter and sort params come later.
export const providerListQuerySchema = z.object({
    // Trimmed, so a keyword of only spaces reads as no keyword. The cap also
    // bounds how many words one request can split into.
    q: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
