import type { ServicePortfolio } from '@mangodb/shared';
import { prisma } from './prisma';
import { ApiError } from './api-error';
import { toDateOnly } from './dates';
import { uniqueViolationDetails, uniqueViolationFields } from './prisma-errors';
import { PORTFOLIO_UNIQUE_FIELDS } from '../schemas/portfolio.schema';
import type { Prisma } from '../generated/prisma/client';

// The columns a portfolio response may carry. Naming them keeps the response
// shape deliberate rather than "whatever the row has", and gives POST the
// same one to reuse.
export const portfolioSelect = {
    portfolioId: true,
    listingId: true,
    portfolioName: true,
    portfolioDescription: true,
    developmentDate: true,
    portfolioImage: true,
    portfolioLink: true,
} as const satisfies Prisma.ServicePortfolioSelect;

type SelectedPortfolio = {
    portfolioId: number;
    listingId: number;
    portfolioName: string;
    portfolioDescription: string | null;
    developmentDate: Date;
    portfolioImage: string;
    portfolioLink: string;
};

// developmentDate is a Date on the Prisma side but ships over JSON as a
// string (ServicePortfolio's wire type), so every path that returns a row
// goes through here instead of handing the raw Prisma result to res.json.
// @db.Date columns come back at UTC midnight, so slicing the ISO string is a
// plain YYYY-MM-DD with no timezone drift.
export function toServicePortfolio(row: SelectedPortfolio): ServicePortfolio {
    return {
        portfolioId: row.portfolioId,
        // The service's listing_id, named for the resource (GET /services/:serviceId).
        serviceId: row.listingId,
        portfolioName: row.portfolioName,
        portfolioDescription: row.portfolioDescription,
        developmentDate: toDateOnly(row.developmentDate),
        portfolioImage: row.portfolioImage,
        portfolioLink: row.portfolioLink,
    };
}

// Authorizes, and hands back portfolioImage so a replacement can clean up
// the old object. There is no owner column: the company is three hops away,
// service_portfolio -> service -> listing, so asking for it as a nested
// select beats walking the chain query by query.
export async function assertPortfolioOwned(
    portfolioId: number,
    companyId: number,
): Promise<{ portfolioImage: string }> {
    const portfolio = await prisma.servicePortfolio.findUnique({
        where: { portfolioId },
        select: {
            portfolioImage: true,
            service: { select: { listing: { select: { companyId: true } } } },
        },
    });

    if (!portfolio) {
        throw ApiError.notFound('Portfolio not found');
    }

    // listing.companyId is nullable. An orphaned listing holds null, which
    // never equals a real companyId, so it lands on 403 without a case of
    // its own.
    if (portfolio.service.listing.companyId !== companyId) {
        throw ApiError.forbidden('This portfolio belongs to another company');
    }

    return { portfolioImage: portfolio.portfolioImage };
}

// @@unique([listingId, portfolioLink]): this service already carries that
// link on another row. A 409, or null when err is something else.
export function portfolioLinkConflict(err: unknown): ApiError | null {
    const fields = uniqueViolationFields(err, PORTFOLIO_UNIQUE_FIELDS);
    return fields
        ? ApiError.conflict(
              'This listing already has that portfolio link',
              uniqueViolationDetails(fields),
          )
        : null;
}
