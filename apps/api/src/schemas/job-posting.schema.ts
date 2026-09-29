import { z } from 'zod';
import { LISTING_STATUSES } from '@mangodb/shared';

function todayUtcString(): string {
    return new Date().toISOString().slice(0, 10);
}

// Check that the deadline is today or in the future
export function isDeadlineInFutureOrToday(dateStr: string): boolean {
    return dateStr >= todayUtcString();
}

// Validate that minBudget does not exceed maxBudget when both exist
export function minBudgetDoesNotExceedMax(data: {
    minBudget?: number | null | undefined;
    maxBudget: number;
}): boolean {
    if (data.minBudget != null) {
        return data.minBudget <= data.maxBudget;
    }
    return true;
}

export const jobPostingFields = {
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
    minBudget: z.preprocess(
        (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
        z.coerce
            .number()
            .int('Minimum budget must be an integer')
            .min(0, 'Minimum budget cannot be negative')
            .max(2147483647, 'Minimum budget exceeds maximum allowed')
            .nullable()
            .optional(),
    ),
    maxBudget: z.preprocess(
        (val) =>
            typeof val === 'string' && val.trim() === '' ? undefined : val,
        z.coerce
            .number({ message: 'Maximum budget is required' })
            .int('Maximum budget must be an integer')
            .positive('Maximum budget must be greater than zero')
            .max(2147483647, 'Maximum budget exceeds maximum allowed'),
    ),
    locationPref: z
        .string()
        .trim()
        .max(100, 'Location preference cannot exceed 100 characters')
        .nullable()
        .optional(),
    duration: z
        .string()
        .trim()
        .max(100, 'Duration cannot exceed 100 characters')
        .nullable()
        .optional(),
    deadline: z.iso
        .date('Deadline must be in YYYY-MM-DD format')
        .refine(isDeadlineInFutureOrToday, {
            message: 'Deadline cannot be in the past',
        })
        .nullable()
        .optional(),
    categoryIds: z
        .array(z.coerce.number().int().positive().max(2147483647))
        .max(10, 'Cannot select more than 10 categories')
        .optional(),
} as const;

// strictObject so unexpected fields or typos are rejected with 400 VALIDATION_FAILED
export const createJobPostingSchema = z
    .strictObject(jobPostingFields)
    .refine(minBudgetDoesNotExceedMax, {
        message: 'Minimum budget cannot exceed maximum budget',
        path: ['minBudget'],
    });

export const jobPostingIdParamSchema = z.object({
    jobPostingId: z.coerce.number().int().positive().max(2147483647),
});

// Query parameters for GET /job-postings.
// Supports status filtering (DRAFT | OPEN | CLOSED) and filtering by companyId.
// Preprocesses empty strings to undefined so blank query params (e.g. ?status=&companyId=) do not fail validation.
export const jobPostingListQuerySchema = z.object({
    status: z.preprocess(
        (val) => (val === '' ? undefined : val),
        z.enum(LISTING_STATUSES).optional(),
    ),
    companyId: z.preprocess(
        (val) => (val === '' ? undefined : val),
        z.coerce.number().int().positive().max(2147483647).optional(),
    ),
});
