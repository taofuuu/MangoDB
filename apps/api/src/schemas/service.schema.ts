import { z } from 'zod';
import { LISTING_STATUSES, SEARCH_SERVICES_ORDERS } from '@mangodb/shared';
import { INT4_MAX, int4Id } from './common.schema';

// One category or tech name. cat_name and tech_stack_name are both
// VarChar(100), so one rule fits both (conventions §12).
const nameField = z.string().trim().max(100);
// How many names one listing or one filter may carry.
const NAME_LIST_MAX = 20;

export const SERVICE_BUDGET_RANGE_ERROR =
    'minBudget must be less than or equal to maxBudget';

// PATCH calls this with the submitted fields merged over the stored row.
export function serviceBudgetRangeIsValid(data: {
    minBudget?: number | null | undefined;
    maxBudget?: number | null | undefined;
}): boolean {
    return (
        data.minBudget == null ||
        data.maxBudget == null ||
        data.minBudget <= data.maxBudget
    );
}

const serviceFields = {
    listingTitle: z.string().trim().min(1).max(255),
    listingDesc: z.string().trim().min(1),
    minBudget: z.number().int().nonnegative().max(INT4_MAX),
    maxBudget: z.number().int().positive().max(INT4_MAX),
    categoryIds: z.array(z.number().int().positive().max(INT4_MAX)),
    // ADR 0009. Tech names as typed, e.g. ["React", "Node.js"]. A blank
    // name is a mistake in the body, so it is a 400 rather than dropped.
    techStack: z.array(nameField.min(1)).max(NAME_LIST_MAX),
} as const;

export const createListingSchema = z
    .object({
        listingTitle: serviceFields.listingTitle,
        listingDesc: serviceFields.listingDesc,
        minBudget: serviceFields.minBudget.optional(),
        maxBudget: serviceFields.maxBudget.optional(),
        categoryIds: serviceFields.categoryIds.default([]),
        techStack: serviceFields.techStack.default([]),
    })
    .refine(serviceBudgetRangeIsValid, {
        message: SERVICE_BUDGET_RANGE_ERROR,
        path: ['minBudget'],
    });

// PATCH sends only changed fields. Category and tech arrays replace their
// whole existing sets; [] deliberately clears one. The controller validates
// a one-sided budget change against the stored other side.
export const updateListingSchema = z
    .strictObject({
        ...serviceFields,
        minBudget: serviceFields.minBudget.nullable(),
        maxBudget: serviceFields.maxBudget.nullable(),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, {
        message: 'Provide at least one field to update',
    });

export type CreateListingInput = z.infer<typeof createListingSchema>;

// US3-2. A repeated param (?category=Web&category=Mobile) arrives as an array,
// a single one as a plain string. Both become an array here. Blank values are
// dropped, like a blank q, and the caps bound how big one query can get.
const nameList = z.preprocess(
    (value) => (typeof value === 'string' ? [value] : value),
    z
        .array(nameField)
        .max(NAME_LIST_MAX)
        .transform((names) => names.filter(Boolean)),
);

// A blank query value (empty or only spaces) means the filter is not used.
// Without this, coerce would read it as 0. Used by price and companyId.
function blankToUndefined(value: unknown): unknown {
    return typeof value === 'string' && value.trim() === '' ? undefined : value;
}

// A price slider end: whole baht, same ceiling as the budget columns. A blank
// value (?maxPrice=) means no limit.
const price = z.preprocess(
    blankToUndefined,
    z.coerce.number().int().nonnegative().max(INT4_MAX).optional(),
);

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
        // One company's services only, e.g. its profile page. A blank value
        // means no filter, like a blank price. Digits only: Number() alone
        // would read "0x10" as 16 and "1e3" as 1000, so those are a 400, as
        // are "abc" and 0.
        companyId: z.preprocess(
            blankToUndefined,
            z
                .string()
                .regex(/^\d+$/, 'companyId must be a whole number')
                .transform(Number)
                .pipe(z.number().int().positive().max(INT4_MAX))
                .optional(),
        ),
        orderBy: z.enum(SEARCH_SERVICES_ORDERS).default('newest'),
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

export type ServiceListQuery = z.infer<typeof serviceListQuerySchema>;

// GET /services/mine. A blank ?status= means no filter, like GET
// /job-postings. There is no DRAFT status (ADR 0010), so only OPEN and
// CLOSED pass; anything else, DRAFT included, is a 400.
export const serviceMineQuerySchema = z.object({
    status: z.preprocess(
        (val) => (val === '' ? undefined : val),
        z.enum(LISTING_STATUSES).extract(['OPEN', 'CLOSED']).optional(),
    ),
});

// Path params arrive as strings, so this coerces before the integer check —
// same reason portfolioIdParamSchema needs z.coerce. Shared by the service
// detail, update, and delete endpoints.
export const listingIdParamSchema = z.object({
    listingId: int4Id,
});
