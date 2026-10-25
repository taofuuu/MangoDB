import { z } from 'zod';
import { LISTING_STATUSES, SERVICE_SORT_ORDERS } from '@mangodb/shared';
import {
    blankToUndefined,
    optionalQueryId,
    int4Id,
    minBudgetDoesNotExceedMax,
    pageQueryFields,
    nameField,
    NAME_LIST_MAX,
    nameList,
    priceFilter,
} from './common.schema';
import { BUDGET_RANGE_ERROR, listingFields } from './listing.schema';

const serviceFields = {
    ...listingFields,
    // ADR 0009. Tech names as typed, e.g. ["React", "Node.js"]. A blank
    // name is a mistake in the body, so it is a 400 rather than dropped.
    techStack: z.array(nameField.min(1)).max(NAME_LIST_MAX),
} as const;

// strictObject: a misspelled key is a 400, not a service created without it.
export const createServiceSchema = z
    .strictObject({
        listingTitle: serviceFields.listingTitle,
        listingDesc: serviceFields.listingDesc,
        minBudget: serviceFields.minBudget.optional(),
        maxBudget: serviceFields.maxBudget.optional(),
        categoryIds: serviceFields.categoryIds.optional(),
        techStack: serviceFields.techStack.optional(),
    })
    .refine(minBudgetDoesNotExceedMax, {
        message: BUDGET_RANGE_ERROR,
        path: ['minBudget'],
    });

// PATCH sends only changed fields. Category and tech arrays replace their
// whole existing sets; [] deliberately clears one. The controller validates
// a one-sided budget change against the stored other side.
export const updateServiceSchema = z
    .strictObject({
        ...serviceFields,
        minBudget: serviceFields.minBudget.nullable(),
        maxBudget: serviceFields.maxBudget.nullable(),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, {
        message: 'Provide at least one field to update',
    });

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

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
        minPrice: priceFilter,
        maxPrice: priceFilter,
        // One company's services only, e.g. its profile page.
        companyId: optionalQueryId('companyId'),
        orderBy: z.enum(SERVICE_SORT_ORDERS).default('newest'),
        ...pageQueryFields,
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
// /jobs. There is no DRAFT status (ADR 0010), so only OPEN and
// CLOSED pass; anything else, DRAFT included, is a 400.
export const serviceMineQuerySchema = z.object({
    status: z.preprocess(blankToUndefined, z.enum(LISTING_STATUSES).optional()),
});

// Path params arrive as strings, so this coerces before the integer check —
// same reason portfolioIdParamSchema needs z.coerce. Shared by the service
// detail, update, and delete endpoints (/services/:serviceId).
export const serviceIdParamSchema = z.object({
    serviceId: int4Id,
});
