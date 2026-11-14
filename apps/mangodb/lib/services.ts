// Everything the web asks /services for: creating and editing one (US2-1,
// US2-3) and the search screen's list and filter options (US3-1 / US3-2).
// Backend: apps/api/src/controllers/service.controller.ts.

// ---------------------------------------------------------------------------
// Wire types come from @mangodb/shared. techStack is the SERVICE's own stack
// (ADR 0009), so it sits at the top level, not inside `company`.
// ---------------------------------------------------------------------------

import type {
    Category,
    CreateServiceRequest,
    Paginated,
    Service,
    ServiceFilterOptions,
    ServiceSortOrder,
    ServiceSummary,
    UpdateServiceRequest,
} from '@mangodb/shared';
import { apiFetch } from './api';
import { cachedGet, invalidateAfter } from './apiCache';

export function createService(body: CreateServiceRequest): Promise<Service> {
    // '/services' covers search pages and filter-options, which can gain a new
    // tech stack name from this listing.
    return invalidateAfter(
        apiFetch<Service>('/services', {
            method: 'POST',
            body: JSON.stringify(body),
        }),
        '/services',
    );
}

export function getService(serviceId: number): Promise<Service> {
    const path = `/services/${serviceId}`;
    return cachedGet(path, () => apiFetch<Service>(path));
}

export function listMyServices(): Promise<Service[]> {
    const path = '/services/mine';
    return cachedGet(path, () => apiFetch<Service[]>(path));
}

// A Service (GET /services/mine) in the ServiceSummary shape the
// service detail panel takes. The listing holds category ids and the panel
// shows names, so they are looked up in the catalog (GET /categories).
export function toServiceSummary(
    listing: Service,
    categories: Category[],
): ServiceSummary {
    const names = new Map(
        categories.map((c) => [c.categoryId, c.categoryName]),
    );

    return {
        serviceId: listing.serviceId,
        listingTitle: listing.listingTitle,
        listingDesc: listing.listingDesc,
        minBudget: listing.minBudget,
        maxBudget: listing.maxBudget,
        // Sorted, the way GET /services returns them.
        categories: listing.categoryIds
            .map((id) => names.get(id))
            .filter((name): name is string => name !== undefined)
            .sort(),
        techStack: listing.techStack,
        company: listing.company,
        // CompanyServiceCard and ServiceDetailPanel do not display the card's
        // rating summary, which is only returned by GET /services.
        averageRating: null,
        ratingCount: 0,
    };
}

// US2-3. The backend owns validation and authorization; this helper keeps the
// endpoint contract out of the form so create and edit share one data path.
export function updateService(
    serviceId: number,
    body: UpdateServiceRequest,
): Promise<Service> {
    return invalidateAfter(
        apiFetch<Service>(`/services/${serviceId}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        }),
        '/services',
    );
}

// US2-4. The API answers 409 when a project is linked to the service, and
// removes the service's portfolio items along with it, so both caches go.
export function deleteService(serviceId: number): Promise<void> {
    return invalidateAfter(
        apiFetch<void>(`/services/${serviceId}`, { method: 'DELETE' }),
        '/services',
        '/portfolios',
    );
}

// What the T3.2 sidebar edits.
export type SearchServicesFilters = {
    categories: string[];
    techStack: string[];
    minBudget: number | null;
    maxBudget: number | null;
};

export const EMPTY_SEARCH_SERVICES_FILTERS: SearchServicesFilters = {
    categories: [],
    techStack: [],
    minBudget: null,
    maxBudget: null,
};

export type SearchServicesParams = {
    q: string;
    orderBy: ServiceSortOrder;
    page: number;
    pageSize: number;
    filters: SearchServicesFilters;
};

// ---------------------------------------------------------------------------
// Filter options come from the API because category matching uses catalog
// names and tech-stack names are open-ended (ADR 0009). Hardcoding either can
// render controls that never match the database.
// ---------------------------------------------------------------------------

const FILTER_OPTIONS_MAX_AGE_MS = 5 * 60_000;

export async function getServiceFilterOptions(): Promise<ServiceFilterOptions> {
    // Categories and tech stack names change rarely, so keep them longer than
    // the default. createService still clears them at once.
    const path = '/services/filter-options';
    return cachedGet(
        path,
        () => apiFetch<ServiceFilterOptions>(path),
        FILTER_OPTIONS_MAX_AGE_MS,
    );
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

// One company's open services, for its profile (page 1) and its full services
// page. Same endpoint and shape as the search screen, so a row opens the same
// ServiceDetailPanel.
export function listServices(
    page: number,
    pageSize: number,
    { companyId }: { companyId: number },
): Promise<Paginated<ServiceSummary>> {
    const qs = new URLSearchParams({
        companyId: String(companyId),
        orderBy: 'newest',
        page: String(page),
        pageSize: String(pageSize),
    });

    const path = `/services?${qs.toString()}`;
    return cachedGet(path, () => apiFetch<Paginated<ServiceSummary>>(path));
}

// The search screen: the keyword, the sidebar's filters and the order.
export async function searchServices(
    params: SearchServicesParams,
): Promise<Paginated<ServiceSummary>> {
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

    const path = `/services?${qs.toString()}`;
    return cachedGet(path, () => apiFetch<Paginated<ServiceSummary>>(path));
}
