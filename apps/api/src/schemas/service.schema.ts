import { z } from 'zod';
import { LISTING_STATUSES } from '@mangodb/shared';

// Prisma Int is a 32-bit column: without a max, 3000000000 passes validation
// and fails at the database as a 500. Same ceiling portfolio uses for ids.
const INT_MAX = 2147483647;

// One category or tech name. cat_name and tech_stack_name are both
// VarChar(100), so one rule fits both (conventions §12).
const nameField = z.string().trim().max(100);
// How many names one listing or one filter may carry.
const NAME_LIST_MAX = 20;

export const createListingSchema = z
    .object({
        listingTitle: z.string().trim().min(1).max(255),
        listingDesc: z.string().trim().min(1),
        minBudget: z.number().int().nonnegative().max(INT_MAX).optional(),
        maxBudget: z.number().int().positive().max(INT_MAX).optional(),
        categoryIds: z
            .array(z.number().int().positive().max(INT_MAX))
            .default([]),
        // ADR 0009. Tech names as typed, e.g. ["React", "Node.js"]. A blank
        // name is a mistake in the body, so it is a 400 rather than dropped.
        techStack: z.array(nameField.min(1)).max(NAME_LIST_MAX).default([]),
    })
    .refine(
        (b) =>
            b.minBudget === undefined ||
            b.maxBudget === undefined ||
            b.minBudget <= b.maxBudget,
        {
            message: 'minBudget must be less than or equal to maxBudget',
            path: ['minBudget'],
        },
    );

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
    z.coerce.number().int().nonnegative().max(INT_MAX).optional(),
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
        // written under time-crunch bypass — review later
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
                .pipe(z.number().int().positive().max(INT_MAX))
                .optional(),
        ),
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
// same reason portfolioIdParamSchema needs z.coerce. Used by DELETE
// /services/:listingId.
export const listingIdParamSchema = z.object({
    listingId: z.coerce.number().int().positive().max(INT_MAX),
});
