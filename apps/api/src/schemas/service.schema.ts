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
    })
    .refine((b) => b.minBudget === undefined || b.minBudget <= b.maxBudget, {
        message: 'minBudget must be less than or equal to maxBudget',
        path: ['minBudget'],
    });

export type CreateListingInput = z.infer<typeof createListingSchema>;
