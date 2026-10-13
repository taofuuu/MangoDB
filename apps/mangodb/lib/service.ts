import { apiFetch } from '@/lib/api';
import type { ServiceListing, ServicePortfolio } from '@mangodb/shared';

export interface CreateServiceBody {
    listingTitle: string;
    listingDesc: string;
    minBudget?: number;
    maxBudget?: number;
    categoryIds?: number[];
    techStack?: string[];
}

export interface UpdateServiceBody {
    listingTitle?: string;
    listingDesc?: string;
    minBudget?: number | null;
    maxBudget?: number | null;
    categoryIds?: number[];
    techStack?: string[];
}

export function createService(
    body: CreateServiceBody,
): Promise<ServiceListing> {
    return apiFetch<ServiceListing>('/services', {
        method: 'POST',
        body: JSON.stringify(body),
    });
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
    body: UpdateServiceBody,
): Promise<ServiceListing> {
    return apiFetch<ServiceListing>(`/services/${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

export function createPortfolioForListing(
    listingId: number,
    body: FormData,
): Promise<ServicePortfolio> {
    body.append('listingId', String(listingId));
    return apiFetch<ServicePortfolio>('/portfolios', {
        method: 'POST',
        body,
    });
}
