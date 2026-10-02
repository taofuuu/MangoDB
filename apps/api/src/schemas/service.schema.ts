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

// US3-1. Same paging bounds as GET /companies, so one request cannot pull
// every service into memory.
export const serviceListQuerySchema = z.object({
    // Trimmed, so a keyword of only spaces reads as no keyword. The cap also
    // bounds how many words one request can split into.
    q: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
