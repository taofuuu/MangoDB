import type { ServicePortfolio } from '@mangodb/shared';
import { prisma } from './prisma';
import { ApiError } from './ApiError';

// The columns a portfolio response may carry. The table holds nothing else
// today, but naming them keeps the response shape deliberate rather than
// "whatever the row has", and gives POST the same one to reuse.
export const portfolioSelect = {
    portfolio_id: true,
    listing_id: true,
    portfolio_link: true,
} as const;

// Reads the row and authorizes it in one round trip. There is no owner column:
// the company is three hops away, service_portfolio -> service -> listing, so
// asking for it as a nested select beats walking the chain query by query.
export async function getOwnedPortfolio(
    portfolioId: number,
    companyId: number,
): Promise<ServicePortfolio> {
    const portfolio = await prisma.service_portfolio.findUnique({
        where: { portfolio_id: portfolioId },
        select: {
            ...portfolioSelect,
            service: { select: { listing: { select: { company_id: true } } } },
        },
    });

    if (!portfolio) {
        throw ApiError.notFound('Portfolio not found');
    }

    // listing.company_id is nullable. An orphaned listing holds null, which
    // never equals a real company_id, so it lands on 403 without a case of
    // its own.
    const { service, ...row } = portfolio;
    if (service.listing.company_id !== companyId) {
        throw ApiError.forbidden('This portfolio belongs to another company');
    }

    return row;
}
