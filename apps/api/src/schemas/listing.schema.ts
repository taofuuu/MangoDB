import { z } from 'zod';

// Prisma Int is a 32-bit column: without a max, 3000000000 passes validation
// and fails at the database as a 500. Same ceiling portfolio uses for ids.
const INT_MAX = 2147483647;

const base = z.object({
    listingTitle: z.string().trim().min(1).max(255),
    listingDesc: z.string().trim().min(1),
    minBudget: z.number().int().nonnegative().max(INT_MAX).optional(),
    maxBudget: z.number().int().positive().max(INT_MAX),
    categoryIds: z.array(z.number().int().positive().max(INT_MAX)).default([]),
});

const serviceListing = base.extend({ type: z.literal('SERVICE') });

const jobListing = base.extend({
    type: z.literal('JOB'),
    jobRequirement: z
        .object({
            locationPref: z.string().trim().max(100).optional(),
            duration: z.string().trim().max(100).optional(),
            // Date-only column (@db.Date): a YYYY-MM-DD string, then a Date at
            // UTC midnight. z.coerce.date() would also take a full timestamp,
            // and a client in UTC+7 sending one would store the day before
            // (same reasoning as developmentDate in portfolio.schema.ts).
            deadline: z.iso
                .date()
                .transform((day) => new Date(`${day}T00:00:00Z`))
                .optional(),
        })
        .default({}),
});

export const createListingSchema = z
    .discriminatedUnion('type', [serviceListing, jobListing])
    .refine((b) => b.minBudget === undefined || b.minBudget <= b.maxBudget, {
        message: 'minBudget must be less than or equal to maxBudget',
        path: ['minBudget'],
    });

export type CreateListingInput = z.infer<typeof createListingSchema>;
