import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import {
    assertPortfolioOwned,
    portfolioSelect,
    toServicePortfolio,
} from '../lib/portfolio';
import { omitUndefined } from '../lib/objects';
import {
    isRecordNotFound,
    uniqueViolationDetails,
    uniqueViolationFields,
} from '../lib/prismaErrors';
import { parseBody, parseParams } from '../middleware/validate';
import {
    PORTFOLIO_UNIQUE_FIELDS,
    createPortfolioSchema,
    portfolioIdParamSchema,
    updatePortfolioSchema,
} from '../schemas/portfolio.schema';

// Creating a new work sample/portfolio item (POST /portfolios)
// Creating a new work sample/portfolio item (POST /portfolios)
export async function createPortfolio(
    req: Request,
    res: Response,
): Promise<void> {
    const data = parseBody(createPortfolioSchema, req.body);
    const companyId = Number(req.auth!.sub);

    // ตรวจสอบสิทธิ์ Listing
    const service = await prisma.service.findUnique({
        where: { listing_id: data.listing_id },
        select: { listing: { select: { company_id: true } } },
    });

    if (!service) {
        throw ApiError.notFound('Service listing not found');
    }

    if (service.listing.company_id !== companyId) {
        throw ApiError.forbidden('This service belongs to another company');
    }

    let created;
    try {
        created = await prisma.service_portfolio.create({
            data: {
                portfolio_name: data.portfolio_name,
                portfolio_description: data.portfolio_description ?? null,
                development_date: data.development_date,
                portfolio_image: data.portfolio_image,
                portfolio_link: data.portfolio_link,
                service: {
                    connect: {
                        listing_id: data.listing_id,
                    },
                },
            },
            select: portfolioSelect,
        });
    } catch (err) {
        const fields = uniqueViolationFields(err, PORTFOLIO_UNIQUE_FIELDS);
        if (fields) {
            throw ApiError.conflict(
                'This listing already has that portfolio link',
                uniqueViolationDetails(fields),
            );
        }
        throw err;
    }

    res.status(201).json(toServicePortfolio(created));
}

// Editing a work sample: name, description, development date, image, and/or
// link — PATCH, so the body carries only the fields being changed.
export async function updatePortfolio(
    req: Request,
    res: Response,
): Promise<void> {
    const { portfolioId } = parseParams(portfolioIdParamSchema, req.params);
    const data = parseBody(updatePortfolioSchema, req.body);
    const companyId = Number(req.auth!.sub);

    // Checked before any write, and the two cases stay distinct: 404 for an
    // unknown id, 403 for another company's (README.md's 401/403/404 rule).
    await assertPortfolioOwned(portfolioId, companyId);

    // No same-value early return here: Postgres unique indexes only compare
    // against *other* rows, so writing portfolio_link back to its current
    // value can never self-collide. Skipping the write was a micro-
    // optimization, not a correctness need — and with five editable fields
    // now, a check keyed on one of them would silently drop the rest of the
    // PATCH whenever that one field happened to be unchanged.
    let updated;
    try {
        updated = await prisma.service_portfolio.update({
            where: {
                portfolio_id: portfolioId,
                service: { listing: { company_id: companyId } },
            },
            data: omitUndefined(data),
            select: portfolioSelect,
        });
    } catch (err) {
        // @@unique([listing_id, portfolio_link]) — this listing already
        // carries that link on some other row.
        const fields = uniqueViolationFields(err, PORTFOLIO_UNIQUE_FIELDS);
        if (fields) {
            throw ApiError.conflict(
                'This listing already has that portfolio link',
                uniqueViolationDetails(fields),
            );
        }
        // Deleted between assertPortfolioOwned and here.
        if (isRecordNotFound(err)) {
            throw ApiError.notFound('Portfolio not found');
        }
        throw err;
    }

    res.json(toServicePortfolio(updated));
}

// Removing a work sample. Hard delete: nothing in the schema references a
// portfolio row, and a soft-deleted one would keep occupying its slot in the
// unique index, blocking the same link from ever being added back.
export async function deletePortfolio(
    req: Request,
    res: Response,
): Promise<void> {
    const { portfolioId } = parseParams(portfolioIdParamSchema, req.params);
    const companyId = Number(req.auth!.sub);

    await assertPortfolioOwned(portfolioId, companyId);

    try {
        await prisma.service_portfolio.delete({
            where: {
                portfolio_id: portfolioId,
                service: { listing: { company_id: companyId } },
            },
        });
    } catch (err) {
        // Someone else deleted it between the check above and this write.
        if (isRecordNotFound(err)) {
            throw ApiError.notFound('Portfolio not found');
        }
        throw err;
    }

    res.status(204).end();
}
// Public: Fetching a single portfolio item by ID (GET /portfolios/:portfolioId)
export async function getPortfolio(req: Request, res: Response): Promise<void> {
    const { portfolioId } = parseParams(portfolioIdParamSchema, req.params);

    const portfolio = await prisma.service_portfolio.findUnique({
        where: { portfolio_id: portfolioId },
        select: portfolioSelect,
    });

    if (!portfolio) {
        throw ApiError.notFound('Portfolio not found');
    }

    res.json(toServicePortfolio(portfolio));
}

// Public: Fetching all portfolios, optionally filtered by listingId (GET /portfolios?listingId=123)
export async function getAllPortfolios(
    req: Request,
    res: Response,
): Promise<void> {
    const listingIdParam = req.query.listingId;
    const listingId = listingIdParam ? Number(listingIdParam) : undefined;

    if (listingIdParam && isNaN(listingId!)) {
        throw ApiError.badRequest('Invalid listingId');
    }

    const portfolios = await prisma.service_portfolio.findMany({
        ...(listingId ? { where: { listing_id: listingId } } : {}),
        select: portfolioSelect,
        orderBy: { development_date: 'desc' },
    });

    res.json(portfolios.map(toServicePortfolio));
}
