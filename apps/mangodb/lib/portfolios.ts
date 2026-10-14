import type { ServicePortfolio } from '@mangodb/shared';
import { apiFetch } from './api';

// The endpoint is public and answers with every company's rows when asked for
// nothing, so the caller always says whose. A portfolio row has no owner
// column — the API filters through service -> listing for us.
export function listPortfolios(companyId: number): Promise<ServicePortfolio[]> {
    const query = new URLSearchParams({ companyId: String(companyId) });

    return apiFetch<ServicePortfolio[]>(`/portfolios?${query.toString()}`);
}

// Service details need only work samples attached to the selected service,
// not every portfolio owned by its company.
export function listServicePortfolios(
    serviceId: number,
): Promise<ServicePortfolio[]> {
    const query = new URLSearchParams({ serviceId: String(serviceId) });

    return apiFetch<ServicePortfolio[]>(`/portfolios?${query.toString()}`);
}

// multipart: the image is a file part, so this takes the FormData as built
// and only adds which service the sample belongs to.
export function createPortfolio(
    serviceId: number,
    body: FormData,
): Promise<ServicePortfolio> {
    body.append('serviceId', String(serviceId));
    return apiFetch<ServicePortfolio>('/portfolios', { method: 'POST', body });
}

export function deletePortfolio(portfolioId: number): Promise<void> {
    return apiFetch<void>(`/portfolios/${portfolioId}`, { method: 'DELETE' });
}

export function updatePortfolio(
    portfolioId: number,
    body: FormData,
): Promise<ServicePortfolio> {
    return apiFetch<ServicePortfolio>(`/portfolios/${portfolioId}`, {
        method: 'PATCH',
        body,
    });
}
