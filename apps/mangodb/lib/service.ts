import { apiFetch } from '@/lib/api';

export interface CreateServiceBody {
    listingTitle: string;
    listingDesc: string;
    minBudget?: number;
    maxBudget?: number;
    categoryIds?: number[];
    techStack?: string[];
}

// Minimal shape we need back from POST /services — the full type is
// ServiceListing in @mangodb/shared. We only need serviceId to attach
// portfolios immediately after.
export interface CreatedService {
    serviceId: number;
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number | null;
    listingStatus: string;
    type: string;
    categoryIds: number[];
    techStack?: string[];
}

export function createService(
    body: CreateServiceBody,
): Promise<CreatedService> {
    return apiFetch<CreatedService>('/services', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export function createPortfolioForListing(
    serviceId: number,
    body: FormData,
): Promise<unknown> {
    body.append('serviceId', String(serviceId));
    return apiFetch('/portfolios', { method: 'POST', body });
}
