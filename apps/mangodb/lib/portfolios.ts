import type { ServicePortfolio } from '@mangodb/shared';
import { apiFetch } from './api';
import { cachedGet, invalidateAfter } from './apiCache';

// One company's work samples, or one service's. The API needs one of the
// two; a portfolio row has no owner column, so it filters through
// service -> listing for us.
export function listPortfolios(
    filter: { companyId: number } | { serviceId: number },
): Promise<ServicePortfolio[]> {
    const query = new URLSearchParams(
        'companyId' in filter
            ? { companyId: String(filter.companyId) }
            : { serviceId: String(filter.serviceId) },
    );

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
