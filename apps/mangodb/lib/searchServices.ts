// Data layer for the US3-1 / US3-2 "search services" screen. Calls the real
// GET /services (apps/api/src/controllers/service.controller.ts).
//
// Named searchServices, not services/service: "service" already means
// something else in this codebase (creating/owning a service listing).

// ---------------------------------------------------------------------------
// Types — mirror apps/api/src/lib/service.ts (toServiceSummary).
// NOTE: techStack is the SERVICE's own stack (ADR 0009), so it sits at the top
// level, not inside `company`.
// TODO: once @mangodb/shared is a dependency of apps/mangodb, delete these
// three types and import them from '@mangodb/shared' instead.
// ---------------------------------------------------------------------------

import type {
    PaginationMeta as Pagination,
    ServiceFilterOptions,
    ServiceListResponse,
    ServiceSummary,
} from '@mangodb/shared';
import { apiFetch } from './api';

export type {
    Pagination,
    ServiceFilterOptions,
    ServiceListResponse,
    ServiceSummary,
};

// What the T3.2 sidebar edits.
export type SearchServicesFilters = {
    categories: string[];
    techStack: string[];
    minBudget: number | null;
    maxBudget: number | null;
};

export type SearchServicesOrder = 'newest' | 'price-asc' | 'price-desc';

export const EMPTY_SEARCH_SERVICES_FILTERS: SearchServicesFilters = {
    categories: [],
    techStack: [],
    minBudget: null,
    maxBudget: null,
};

export function formatServiceBudgetRange(
    minBudget: number | null,
    maxBudget: number | null,
): string {
    const format = (value: number) => `฿${value.toLocaleString('en-US')}`;

    if (minBudget == null && maxBudget != null) {
        return `Up to ${format(maxBudget)}`;
    }
    if (minBudget != null && maxBudget == null) {
        return `From ${format(minBudget)}`;
    }

    if (minBudget != null && maxBudget != null) {
        return `${format(minBudget)} – ${format(maxBudget)}`;
    }

    return 'Contact for pricing';
}

export type SearchServicesParams = {
    q: string;
    orderBy: SearchServicesOrder;
    page: number;
    pageSize: number;
    filters: SearchServicesFilters;
};

// ---------------------------------------------------------------------------
// Filter options come from the API because category matching uses catalog
// names and tech-stack names are open-ended (ADR 0009). Hardcoding either can
// render controls that never match the database.
// ---------------------------------------------------------------------------

export async function fetchSearchServicesFilterOptions(): Promise<ServiceFilterOptions> {
    return apiFetch<ServiceFilterOptions>('/services/filter-options');
}

// ---------------------------------------------------------------------------
// The real call.
//
// Frontend -> backend param names (serviceListQuerySchema):
//   categories -> category (repeated: ?category=A&category=B)
//   techStack  -> techStack (repeated)
//   minBudget  -> minPrice
//   maxBudget  -> maxPrice
//   q, orderBy, page, pageSize -> same
// ---------------------------------------------------------------------------

export async function searchServices(
    params: SearchServicesParams,
): Promise<ServiceListResponse> {
    const { q, orderBy, page, pageSize, filters } = params;
    const { minBudget, maxBudget } = filters;

    // The API answers 400 when minPrice > maxPrice, and such a range can't
    // match anything anyway — so show "no results" instead of an error.
    if (minBudget != null && maxBudget != null && minBudget > maxBudget) {
        return {
            items: [],
            pagination: { page: 1, pageSize, totalItems: 0, totalPages: 0 },
        };
    }

    const qs = new URLSearchParams();

    // The API trims q and caps it at 100 characters.
    const keyword = q.trim().slice(0, 100);
    if (keyword) qs.set('q', keyword);
    qs.set('orderBy', orderBy);

    filters.categories.forEach((category) => qs.append('category', category));
    filters.techStack.forEach((t) => qs.append('techStack', t));

    if (minBudget != null) qs.set('minPrice', String(minBudget));
    if (maxBudget != null) qs.set('maxPrice', String(maxBudget));

    qs.set('page', String(page));
    qs.set('pageSize', String(pageSize)); // API max is 50

    return apiFetch<ServiceListResponse>(`/services?${qs.toString()}`);
}
