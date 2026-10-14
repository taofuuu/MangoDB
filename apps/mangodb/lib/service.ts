import { apiFetch } from '@/lib/api';
import { invalidateAfter } from '@/lib/apiCache';
import type {
    ServiceListing,
    ServicePortfolio,
    UpdateServiceRequest,
} from '@mangodb/shared';

export interface CreateServiceBody {
    listingTitle: string;
    listingDesc: string;
    minBudget?: number;
    maxBudget?: number;
    categoryIds?: number[];
    techStack?: string[];
}

export function createService(
    body: CreateServiceBody,
): Promise<ServiceListing> {
    // '/services' covers search pages and filter-options, which can gain a new
    // tech stack name from this listing.
    return invalidateAfter(
        apiFetch<ServiceListing>('/services', {
            method: 'POST',
            body: JSON.stringify(body),
        }),
        '/services',
    );
}

export function getService(listingId: number): Promise<ServiceListing> {
    return apiFetch<ServiceListing>(`/services/${listingId}`);
}

export function getMyServices(): Promise<ServiceListing[]> {
    return apiFetch<ServiceListing[]>('/services/mine');
}

// US2-3. The backend owns validation and authorization; this helper keeps the
// endpoint contract out of the form so create and edit share one data path.
export function updateService(
    listingId: number,
    body: UpdateServiceRequest,
): Promise<ServiceListing> {
    return invalidateAfter(
        apiFetch<ServiceListing>(`/services/${listingId}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        }),
        '/services',
    );
}

export function createPortfolioForListing(
    listingId: number,
    body: FormData,
): Promise<ServicePortfolio> {
    body.append('listingId', String(listingId));
    return invalidateAfter(
        apiFetch<ServicePortfolio>('/portfolios', { method: 'POST', body }),
        '/portfolios',
    );
}
