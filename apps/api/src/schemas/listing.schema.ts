import { z } from 'zod';
import {
    INT4_MAX,
    blankToNull,
    blankToUndefined,
    int4Id,
} from './common.schema';

// The one wording of the budget rule, for create, edit and every kind of
// listing.
export const BUDGET_RANGE_ERROR = 'Minimum budget cannot exceed maximum budget';

// One rule per listing column, shared by services and jobs (conventions §12).
// Each schema decides which are optional or nullable.
export const listingFields = {
    listingTitle: z
        .string()
        .trim()
        .min(1, 'Title is required')
        .max(255, 'Title cannot exceed 255 characters'),
    listingDesc: z
        .string()
        .trim()
        .min(1, 'Description is required')
        .max(10000, 'Description cannot exceed 10000 characters'),
    // A cleared box is null: no lower bound.
    minBudget: z.preprocess(
        blankToNull,
        z.coerce
            .number()
            .int('Minimum budget must be an integer')
            .min(0, 'Minimum budget cannot be negative')
            .max(INT4_MAX, 'Minimum budget exceeds maximum allowed')
            .nullable(),
    ),
    maxBudget: z.preprocess(
        blankToUndefined,
        z.coerce
            .number({ message: 'Maximum budget is required' })
            .int('Maximum budget must be an integer')
            .positive('Maximum budget must be greater than zero')
            .max(INT4_MAX, 'Maximum budget exceeds maximum allowed'),
    ),
    categoryIds: z
        .array(int4Id)
        .max(10, 'Cannot select more than 10 categories'),
} as const;
