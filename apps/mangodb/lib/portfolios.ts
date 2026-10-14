import type { ServicePortfolio } from '@mangodb/shared';
import { apiFetch } from './api';
import { cachedGet, invalidateAfter } from './apiCache';

// The endpoint is public and answers with every company's rows when asked for
// nothing, so the caller always says whose. A portfolio row has no owner
// column — the API filters through service -> listing for us.
export function listPortfolios(companyId: number): Promise<ServicePortfolio[]> {
    const query = new URLSearchParams({ companyId: String(companyId) });

    const path = `/portfolios?${query.toString()}`;
    return cachedGet(path, () => apiFetch<ServicePortfolio[]>(path));
}

// Service details need only work samples attached to the selected service,
// not every portfolio owned by its company.
export function listServicePortfolios(
    serviceId: number,
): Promise<ServicePortfolio[]> {
    const query = new URLSearchParams({ serviceId: String(serviceId) });

    const path = `/portfolios?${query.toString()}`;
    return cachedGet(path, () => apiFetch<ServicePortfolio[]>(path));
}

// multipart: the image is a file part, so this takes the FormData as built
// and only adds which service the sample belongs to.
export function createPortfolio(
    serviceId: number,
    body: FormData,
): Promise<ServicePortfolio> {
    body.append('serviceId', String(serviceId));
    return invalidateAfter(
        apiFetch<ServicePortfolio>('/portfolios', { method: 'POST', body }),
        '/portfolios',
    );
}

export function deletePortfolio(portfolioId: number): Promise<void> {
    return invalidateAfter(
        apiFetch<void>(`/portfolios/${portfolioId}`, { method: 'DELETE' }),
        '/portfolios',
    );
}

export function updatePortfolio(
    portfolioId: number,
    body: FormData,
): Promise<ServicePortfolio> {
    return invalidateAfter(
        apiFetch<ServicePortfolio>(`/portfolios/${portfolioId}`, {
            method: 'PATCH',
            body,
        }),
        '/portfolios',
    );
}
