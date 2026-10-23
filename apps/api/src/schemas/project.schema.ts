import { z } from 'zod';
import { blankToNull, int4Id, pageQueryFields } from './common.schema';

export const projectIdParamSchema = z.object({
    projectId: int4Id,
});

// US4-9. GET /projects/mine: the same paging as every list.
export const projectListQuerySchema = z.object(pageQueryFields);

// US4-10. POST /projects/:projectId/updates. Same 10000 cap as proposal terms
// and listing descriptions. strictObject, so a misspelt field is a 400.
export const createProjectUpdateSchema = z.strictObject({
    updateText: z
        .string()
        .trim()
        .min(1, 'Update text is required')
        .max(10000, 'Update text cannot exceed 10000 characters'),
});

const scoreSchema = z.number().int().min(1).max(5);

// ADR 0018, US5-1, US5-2. Four 1-5 scores and an optional comment up to 500 characters.
export const reviewFields = {
    workQualityScore: scoreSchema,
    serviceScore: scoreSchema,
    valueForMoneyScore: scoreSchema,
    deliveryTimeScore: scoreSchema,
    comment: z
        .preprocess(
            blankToNull,
            z
                .string()
                .trim()
                .max(500, 'Comment cannot exceed 500 characters')
                .nullable(),
        )
        .optional(),
} as const;

export const createReviewSchema = z.strictObject(reviewFields);

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
