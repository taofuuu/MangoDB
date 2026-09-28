import { z } from 'zod';

// US3-2. A repeated param (?category=Web&category=Mobile) arrives as an array,
// a single one as a plain string. Both become an array here. Blank values are
// dropped, like a blank q, and the caps bound how big one query can get.
const nameList = z.preprocess(
    (value) => (typeof value === 'string' ? [value] : value),
    z
        .array(z.string().trim().max(100))
        .max(20)
        .transform((names) => names.filter(Boolean)),
);

// US3-1. Same paging bounds as GET /admin/companies, so one request cannot
// pull every Provider into memory. Sort params come later.
export const providerListQuerySchema = z.object({
    // Trimmed, so a keyword of only spaces reads as no keyword. The cap also
    // bounds how many words one request can split into.
    q: z.string().trim().max(100).optional(),
    // US3-2. Exact names, as the result card shows them.
    category: nameList.optional(),
    techStack: nameList.optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
