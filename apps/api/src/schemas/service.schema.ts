import { z } from 'zod';

// Prisma Int is a 32-bit column: without a max, 3000000000 passes validation
// and fails at the database as a 500. Same ceiling portfolio uses for ids.
const INT_MAX = 2147483647;

export const createListingSchema = z
    .object({
        listingTitle: z.string().trim().min(1).max(255),
        listingDesc: z.string().trim().min(1),
        minBudget: z.number().int().nonnegative().max(INT_MAX).optional(),
        maxBudget: z.number().int().positive().max(INT_MAX),
        categoryIds: z
            .array(z.number().int().positive().max(INT_MAX))
            .default([]),
        // ADR 0009. Tech names as typed, e.g. ["React", "Node.js"]. A blank
        // name is a mistake in the body, so it is a 400 rather than dropped.
        techStack: z
            .array(z.string().trim().min(1).max(100))
            .max(20)
            .default([]),
    })
    .refine((b) => b.minBudget === undefined || b.minBudget <= b.maxBudget, {
        message: 'minBudget must be less than or equal to maxBudget',
        path: ['minBudget'],
    });

export type CreateListingInput = z.infer<typeof createListingSchema>;

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

// A price slider end: whole baht, same ceiling as the budget columns.
const price = z.coerce.number().int().nonnegative().max(INT_MAX).optional();

// US3-1. Same paging bounds as GET /companies, so one request cannot pull
// every service into memory. US3-2 adds the filters.
export const serviceListQuerySchema = z
    .object({
        // Trimmed, so a keyword of only spaces reads as no keyword. The cap
        // also bounds how many words one request can split into.
        q: z.string().trim().max(100).optional(),
        // Exact names, as the result card shows them.
        category: nameList.optional(),
        techStack: nameList.optional(),
        minPrice: price,
        maxPrice: price,
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(12),
    })
    .refine(
        (q) =>
            q.minPrice === undefined ||
            q.maxPrice === undefined ||
            q.minPrice <= q.maxPrice,
        {
            message: 'minPrice must be less than or equal to maxPrice',
            path: ['minPrice'],
        },
    );

// Path params arrive as strings, so this coerces before the integer check —
// same reason portfolioIdParamSchema needs z.coerce. Used by DELETE
// /services/:listingId.
export const listingIdParamSchema = z.object({
    listingId: z.coerce.number().int().positive().max(INT_MAX),
});
