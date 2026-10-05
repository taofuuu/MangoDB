// Data layer for the US3-1 / US3-2 "search services" screen. Calls the real
// GET /services (apps/api/src/controllers/service.controller.ts).
//
// Named searchServices, not services/service: "service" already means
// something else in this codebase (creating/owning a service listing).

import { apiFetch } from './api';

// ---------------------------------------------------------------------------
// Types — mirror apps/api/src/lib/service.ts (toServiceSummary).
// NOTE: techStack is the SERVICE's own stack (ADR 0009), so it sits at the top
// level, not inside `company`.
// TODO: once @mangodb/shared is a dependency of apps/mangodb, delete these
// three types and import them from '@mangodb/shared' instead.
// ---------------------------------------------------------------------------

export type ServiceSummary = {
    listingId: number;
    listingTitle: string;
    minBudget: number | null;
    maxBudget: number | null;
    categories: string[];
    techStack: string[];
    company: {
        companyId: number;
        companyName: string;
        companyPhoto: string | null;
    };
};

export type Pagination = {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
};

export type ServiceListResponse = {
    items: ServiceSummary[];
    pagination: Pagination;
};

// What the sidebar edits. companyTypes is kept for the mockup but the backend
// has no company-type filter yet, so it is NOT sent (see searchServices below).
export type SearchServicesFilters = {
    categories: string[];
    companyTypes: string[];
    techStack: string[];
    minBudget: number | null;
    maxBudget: number | null;
};

export const EMPTY_SEARCH_SERVICES_FILTERS: SearchServicesFilters = {
    categories: [],
    companyTypes: [],
    techStack: [],
    minBudget: null,
    maxBudget: null,
};

export type SearchServicesParams = {
    q: string;
    page: number;
    pageSize: number;
    filters: SearchServicesFilters;
};

// ---------------------------------------------------------------------------
// Filter options. Still hardcoded: no endpoint feeds these yet.
// The backend matches category / tech stack by exact NAME (case-insensitive),
// so these strings must match the names stored in the database.
// TODO: replace with a real lookup (e.g. GET /categories) when one exists.
// ---------------------------------------------------------------------------

export const SEARCH_SERVICES_CATEGORY_OPTIONS = [
    'Web Development',
    'Mobile Development',
    'UX/UI Design',
    'Technology consultant',
    'Data & Analytics',
    'DevOps',
];

export const SEARCH_SERVICES_COMPANY_TYPE_OPTIONS = [
    'Technology consultant',
    'Software House',
    'Freelancer',
    'Agency',
];

export const SEARCH_SERVICES_TECH_STACK_OPTIONS = [
    'React',
    'Next.js',
    'Node.js',
    'TypeScript',
    'PostgreSQL',
    'Figma',
];

export async function fetchSearchServicesFilterOptions() {
    return {
        categories: SEARCH_SERVICES_CATEGORY_OPTIONS,
        companyTypes: SEARCH_SERVICES_COMPANY_TYPE_OPTIONS,
        techStack: SEARCH_SERVICES_TECH_STACK_OPTIONS,
    };
}

// ---------------------------------------------------------------------------
// The real call.
//
// Frontend -> backend param names (serviceListQuerySchema):
//   categories -> category (repeated: ?category=A&category=B)
//   techStack  -> techStack (repeated)
//   minBudget  -> minPrice
//   maxBudget  -> maxPrice
//   q, page, pageSize -> same
// Not supported by the backend yet, so not sent: companyTypes, orderBy.
// ---------------------------------------------------------------------------

export async function searchServices(
    params: SearchServicesParams,
): Promise<ServiceListResponse> {
    const { q, page, pageSize, filters } = params;
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

    filters.categories.forEach((c) => qs.append('category', c));
    filters.techStack.forEach((t) => qs.append('techStack', t));

    if (minBudget != null) qs.set('minPrice', String(minBudget));
    if (maxBudget != null) qs.set('maxPrice', String(maxBudget));

    qs.set('page', String(page));
    qs.set('pageSize', String(pageSize)); // API max is 50

    return apiFetch<ServiceListResponse>(`/services?${qs.toString()}`);
}
