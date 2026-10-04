// Data layer for the US3-1 "search services" screen (search + filter the list
// of SERVICE listings). One file for the whole domain, matching this
// project's lib/ convention (certificate.ts, companies.ts, portfolios.ts,
// proposals.ts) — no nested lib/services/ folder.
//
// Named searchServices, not services/service: "service" already means
// something else in this codebase (creating/owning a service listing — see
// apps/api/src/controllers/service.controller.ts). This file is specifically
// the search screen's data layer.

// ---------------------------------------------------------------------------
// Types
//
// ServiceSummary / Pagination / ServiceListResponse keep the exact names the
// real API uses (apps/api/src/lib/service.ts, @mangodb/shared), so swapping
// the mock implementation below for a real fetch later needs no renaming.
// TODO: once @mangodb/shared is a dependency of apps/mangodb, delete these
// three types and `import type { ServiceSummary, ... } from '@mangodb/shared'`
// instead.
// ---------------------------------------------------------------------------

export type ServiceSummary = {
    listingId: number;
    listingTitle: string;
    minBudget: number | null;
    maxBudget: number | null;
    categories: string[];
    company: {
        companyId: number;
        companyName: string;
        companyPhoto: string | null;
        techStack: string[];
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

// Structured filters the mockup's sidebar wants. GET /services does not
// accept any of these yet (only q/page/pageSize) — see the WIRING NOTE below.
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
// Mock data. Swap for real options (GET /categories, a tech-stack/company-type
// lookup) once those exist.
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

function makeMockService(
    id: number,
    title: string,
    categories: string[],
    techStack: string[],
    minBudget: number,
    maxBudget: number,
    companyName: string,
): ServiceSummary {
    return {
        listingId: id,
        listingTitle: title,
        minBudget,
        maxBudget,
        categories,
        company: {
            companyId: 1000 + id,
            companyName,
            companyPhoto: null,
            techStack,
        },
    };
}

// 32 rows so pagination (pageSize 3) has something real to page through —
// matches the mockup's "32 items / page 1/20".
const MOCK_SERVICES: ServiceSummary[] = Array.from({ length: 32 }, (_, i) => {
    const n = i + 1;
    return makeMockService(
        n,
        `Web application development with Node.js and React #${n}`,
        [
            SEARCH_SERVICES_CATEGORY_OPTIONS[
                n % SEARCH_SERVICES_CATEGORY_OPTIONS.length
            ],
        ],
        [0, 1, 2, 3].map(
            (offset) =>
                SEARCH_SERVICES_TECH_STACK_OPTIONS[
                    (n + offset) % SEARCH_SERVICES_TECH_STACK_OPTIONS.length
                ],
        ),
        15000 + n * 500,
        50000 + n * 1000,
        `Company Provider ${n}`,
    );
});

// ---------------------------------------------------------------------------
// WIRING NOTE — read before connecting to the real API.
//
// GET /services (apps/api/src/routes/service.routes.ts, requireAuth +
// requireRole('provider', 'receiver')) currently only accepts:
//   q: string, page: number, pageSize: number
//
// It does NOT support, yet:
//   - categories / companyTypes / techStack filters (structured, not keyword)
//   - minBudget / maxBudget range
//   - orderBy
// Company type isn't even in the ServiceSummary response shape today.
//
// So for now searchServices() filters the MOCK dataset client-side using the
// full SearchServicesFilters object, but only forwards q/page/pageSize to the
// shape a real call would use. When the backend adds the missing query
// params, replace the body of searchServices() with the commented block
// below and delete mockSearchServices — no component needs to change, they
// all go through this one function.
//
// lib/api.ts already has this project's fetch wrapper — route the real call
// through that instead of a bare fetch() once this is wired up.
// ---------------------------------------------------------------------------

export async function searchServices(
    params: SearchServicesParams,
): Promise<ServiceListResponse> {
    // --- MOCK implementation (current) ---
    await new Promise((r) => setTimeout(r, 150)); // simulate network latency
    return mockSearchServices(params);

    // --- REAL implementation (uncomment once the backend supports filters) ---
    // const qs = new URLSearchParams({
    //     q: params.q,
    //     page: String(params.page),
    //     pageSize: String(params.pageSize),
    //     // ...append filter params here once the backend accepts them
    // });
    // return apiFetch<ServiceListResponse>(`/services?${qs.toString()}`);
}

export async function fetchSearchServicesFilterOptions() {
    return {
        categories: SEARCH_SERVICES_CATEGORY_OPTIONS,
        companyTypes: SEARCH_SERVICES_COMPANY_TYPE_OPTIONS,
        techStack: SEARCH_SERVICES_TECH_STACK_OPTIONS,
    };
}

function mockSearchServices({
    q,
    page,
    pageSize,
    filters,
}: SearchServicesParams): ServiceListResponse {
    const keyword = q.trim().toLowerCase();

    const matches = (s: ServiceSummary) => {
        if (keyword) {
            const haystack = [
                s.listingTitle,
                s.company.companyName,
                ...s.categories,
                ...s.company.techStack,
            ]
                .join(' ')
                .toLowerCase();
            if (!haystack.includes(keyword)) return false;
        }
        if (
            filters.categories.length > 0 &&
            !filters.categories.some((c) => s.categories.includes(c))
        ) {
            return false;
        }
        if (
            filters.techStack.length > 0 &&
            !filters.techStack.some((t) => s.company.techStack.includes(t))
        ) {
            return false;
        }
        if (
            filters.minBudget != null &&
            (s.maxBudget ?? 0) < filters.minBudget
        ) {
            return false;
        }
        if (
            filters.maxBudget != null &&
            (s.minBudget ?? 0) > filters.maxBudget
        ) {
            return false;
        }
        // companyTypes: ServiceSummary carries no company type field yet, so
        // this filter is a no-op in mock data until that's added.
        return true;
    };

    const filtered = MOCK_SERVICES.filter(matches);
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return {
        items,
        pagination: { page, pageSize, totalItems, totalPages },
    };
}
