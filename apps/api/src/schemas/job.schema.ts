import { z } from 'zod';
import { JOB_SORT_ORDERS, LISTING_STATUSES } from '@mangodb/shared';
import {
    blankToUndefined,
    optionalQueryId,
    int4Id,
    minBudgetDoesNotExceedMax,
    pageQueryFields,
    nameList,
    priceFilter,
} from './common.schema';
import { BUDGET_RANGE_ERROR, listingFields } from './listing.schema';
import { toDateOnly } from '../lib/dates';

function todayUtcString(): string {
    return toDateOnly(new Date());
}

// Check that the deadline is today or in the future
function isDeadlineInFutureOrToday(dateStr: string): boolean {
    return dateStr >= todayUtcString();
}

const jobFields = {
    listingTitle: listingFields.listingTitle,
    listingDesc: listingFields.listingDesc,
    minBudget: listingFields.minBudget.optional(),
    maxBudget: listingFields.maxBudget,
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
    categoryIds: listingFields.categoryIds.optional(),
} as const;

// strictObject so unexpected fields or typos are rejected with 400 VALIDATION_FAILED
export const createJobSchema = z
    .strictObject(jobFields)
    .refine(minBudgetDoesNotExceedMax, {
        message: BUDGET_RANGE_ERROR,
        path: ['minBudget'],
    });

// PATCH sends only what changed, so every field is optional. No budget refine
// here: a body with one budget only means something next to the stored row,
// so the controller checks the merged values instead.
export const updateJobSchema = z
    .strictObject({
        listingTitle: jobFields.listingTitle.optional(),
        listingDesc: jobFields.listingDesc.optional(),
        minBudget: jobFields.minBudget,
        maxBudget: jobFields.maxBudget.optional(),
        locationPref: jobFields.locationPref,
        duration: jobFields.duration,
        deadline: jobFields.deadline,
        categoryIds: jobFields.categoryIds,
    })
    .refine((body) => Object.keys(body).length > 0, {
        message: 'Provide at least one field to update',
    });

export const jobIdParamSchema = z.object({
    jobId: int4Id,
});

// Query parameters for GET /jobs.
// Supports status filtering (OPEN | CLOSED) and filtering by companyId, keyword, category, budget, and deadline.
// Preprocesses empty strings to undefined so blank query params (e.g. ?status=&companyId=) do not fail validation.
export const jobListQuerySchema = z
    .object({
        ...pageQueryFields,
        status: z.preprocess(
            blankToUndefined,
            z.enum(LISTING_STATUSES).optional(),
        ),
        companyId: optionalQueryId('companyId'),
        q: z.preprocess(
            blankToUndefined,
            z.string().trim().max(100).optional(),
        ),
        // US3-4. Category names (ADR 0002), case ignored like the service filter.
        category: nameList.optional(),
        // US3-5. Budget range overlap filter.
        minBudget: priceFilter,
        maxBudget: priceFilter,
        // US3-5. Deadline on or before date (YYYY-MM-DD).
        deadline: z.preprocess(
            blankToUndefined,
            z.iso.date('Deadline must be in YYYY-MM-DD format').optional(),
        ),
        // US3-5. Deadline direction: ANY (no filter), BEFORE (<= date), AFTER (>= date).
        deadlineType: z.preprocess(
            (val) => (typeof val === 'string' ? val.trim().toUpperCase() : val),
            z.enum(['ANY', 'BEFORE', 'AFTER']).optional(),
        ),
        // US3-8 (T3.8.2, T3.8.3). Ordering by budget or deadline. Defaults to newest.
        orderBy: z.preprocess(
            blankToUndefined,
            z.enum(JOB_SORT_ORDERS).default('newest'),
        ),
    })
    .refine(minBudgetDoesNotExceedMax, {
        message: BUDGET_RANGE_ERROR,
        path: ['minBudget'],
    });

// GET /jobs/mine. The caller's own jobs, so no keyword or company filter.
export const jobMineQuerySchema = z.object({
    ...pageQueryFields,
    status: z.preprocess(blankToUndefined, z.enum(LISTING_STATUSES).optional()),
});
