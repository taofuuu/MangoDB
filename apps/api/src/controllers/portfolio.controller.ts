import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import { getOwnedPortfolio, portfolioSelect } from '../lib/portfolio';
import { isRecordNotFound, uniqueViolationFields } from '../lib/prismaErrors';
import { parseBody, parseParams } from '../middleware/validate';
import {
    portfolioIdParamSchema,
    updatePortfolioSchema,
} from '../schemas/portfolio.schema';

// Fixing a dead or mistyped work-sample link. The row keeps its id and stays
// on its listing; only the link changes.
export async function updatePortfolio(
    req: Request,
    res: Response,
): Promise<void> {
    const { portfolioId } = parseParams(portfolioIdParamSchema, req.params);
    const { portfolio_link } = parseBody(updatePortfolioSchema, req.body);

    // Ownership is checked before any write happens, but the response still
    // tells the two cases apart: 404 if the id doesn't exist, 403 if it
    // exists but belongs to another company — matching this API's own
    // 401/403/404 convention (README.md), not a uniform response.
    const portfolio = await getOwnedPortfolio(
        portfolioId,
        Number(req.auth!.sub),
    );

    // Already correct. Returning early keeps the unique index from being asked
    // whether a row collides with itself.
    if (portfolio.portfolio_link === portfolio_link) {
        res.json(portfolio);
        return;
    }

    try {
        res.json(
            await prisma.service_portfolio.update({
                where: { portfolio_id: portfolioId },
                data: { portfolio_link },
                select: portfolioSelect,
            }),
        );
    } catch (err) {
        // @@unique([listing_id, portfolio_link]) — the listing already carries
        // this link on some other row. Unlike register, there is no findUnique
        // pre-check first: that one exists to report a username and an email
        // collision together, and with a single field the index says the same
        // thing one query cheaper.
        if (uniqueViolationFields(err, ['portfolio_link'])) {
            throw ApiError.conflict(
                'This listing already has that portfolio link',
                [
                    {
                        field: 'portfolio_link',
                        message: 'Already on this listing',
                    },
                ],
            );
        }
        // Deleted between getOwnedPortfolio and here.
        if (isRecordNotFound(err)) {
            throw ApiError.notFound('Portfolio not found');
        }
        throw err;
    }
}

// Removing a work sample. Hard delete: nothing in the schema references a
// portfolio row, and a soft-deleted one would keep occupying its slot in the
// unique index, blocking the same link from ever being added back.
export async function deletePortfolio(
    req: Request,
    res: Response,
): Promise<void> {
    const { portfolioId } = parseParams(portfolioIdParamSchema, req.params);

    await getOwnedPortfolio(portfolioId, Number(req.auth!.sub));

    try {
        await prisma.service_portfolio.delete({
            where: { portfolio_id: portfolioId },
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
