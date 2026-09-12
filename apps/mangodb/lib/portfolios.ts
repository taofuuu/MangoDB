import type { ServicePortfolio } from '@mangodb/shared';
import { apiFetch } from './api';

// The endpoint is public and answers with every company's rows when asked for
// nothing, so the caller always says whose. A portfolio row has no owner
// column — the API filters through service -> listing for us.
export function getPortfolios(companyId: number): Promise<ServicePortfolio[]> {
    const query = new URLSearchParams({ companyId: String(companyId) });

    return apiFetch<ServicePortfolio[]>(`/portfolios?${query.toString()}`);
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
