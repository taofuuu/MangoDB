import type { ServicePortfolio } from '@mangodb/shared';
import { prisma } from './prisma';
import { ApiError } from './ApiError';

// The columns a portfolio response may carry. Naming them keeps the response
// shape deliberate rather than "whatever the row has", and gives POST the
// same one to reuse.
export const portfolioSelect = {
    portfolio_id: true,
    listing_id: true,
    portfolio_name: true,
    portfolio_description: true,
    development_date: true,
    portfolio_image: true,
    portfolio_link: true,
} as const;

type SelectedPortfolio = {
    portfolio_id: number;
    listing_id: number;
    portfolio_name: string;
    portfolio_description: string | null;
    development_date: Date;
    portfolio_image: string;
    portfolio_link: string;
};

// development_date is a Date on the Prisma side but ships over JSON as a
// string (ServicePortfolio's wire type), so every path that returns a row
// goes through here instead of handing the raw Prisma result to res.json.
// @db.Date columns come back at UTC midnight, so slicing the ISO string is a
// plain YYYY-MM-DD with no timezone drift.
export function toServicePortfolio(row: SelectedPortfolio): ServicePortfolio {
    return {
        ...row,
        development_date: row.development_date.toISOString().slice(0, 10),
    };
}

// Authorizes, and hands back portfolio_image so a replacement can clean up
// the old object. There is no owner column: the company is three hops away,
// service_portfolio -> service -> listing, so asking for it as a nested
// select beats walking the chain query by query.
export async function assertPortfolioOwned(
    portfolioId: number,
    companyId: number,
): Promise<{ portfolio_image: string }> {
    const portfolio = await prisma.service_portfolio.findUnique({
        where: { portfolio_id: portfolioId },
        select: {
            portfolio_image: true,
            service: { select: { listing: { select: { company_id: true } } } },
        },
    });

    if (!portfolio) {
        throw ApiError.notFound('Portfolio not found');
    }

    // listing.company_id is nullable. An orphaned listing holds null, which
    // never equals a real company_id, so it lands on 403 without a case of
    // its own.
    if (portfolio.service.listing.company_id !== companyId) {
        throw ApiError.forbidden('This portfolio belongs to another company');
    }

    return { portfolio_image: portfolio.portfolio_image };
}
