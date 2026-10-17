import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/api-error';
import {
    assertPortfolioOwned,
    portfolioLinkConflict,
    portfolioSelect,
    toServicePortfolio,
} from '../lib/portfolio';

import { assertListingOwned } from '../lib/listing';
import { removeFromStorageByUrl, BUCKETS } from '../lib/storage';
import { saveWithUpload } from '../lib/upload';

import { omitUndefined } from '../lib/objects';
import { isRecordNotFound, orNotFound } from '../lib/prisma-errors';
import { parseBody, parseParams, parseQuery } from '../middleware/validate';
import {
    createPortfolioSchema,
    portfolioIdParamSchema,
    updatePortfolioSchema,
    portfolioQuerySchema,
} from '../schemas/portfolio.schema';

// Creating a new work sample/portfolio item (POST /portfolios)
export async function createPortfolio(
    req: Request,
    res: Response,
): Promise<void> {
    // 1. Validate image file
    if (!req.file) {
        throw ApiError.badRequest('Portfolio image file is required');
    }

    // 2. Parse Text Fields จาก Form-Data
    const data = parseBody(createPortfolioSchema, req.body);
    const companyId = req.auth!.companyId;

    // 3. 404 for an unknown service, 403 for another company's, before any
    // upload.
    await assertListingOwned(data.serviceId, 'SERVICE', companyId);

    // 4. after authorization, upload the image and store the row. If the
    // row cannot be written, saveWithUpload removes the image again.
    let created;
    try {
        created = await saveWithUpload(
            req.file,
            BUCKETS.PORTFOLIO,
            'portfolios',
            (portfolioImage) =>
                prisma.servicePortfolio.create({
                    data: {
                        portfolioName: data.portfolioName,
                        portfolioDescription: data.portfolioDescription ?? null,
                        developmentDate: data.developmentDate,
                        portfolioImage,
                        portfolioLink: data.portfolioLink,
                        service: {
                            connect: {
                                listingId: data.serviceId,
                            },
                        },
                    },
                    select: portfolioSelect,
                }),
        );
    } catch (err) {
        throw portfolioLinkConflict(err) ?? err;
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
    const companyId = req.auth!.companyId;

    // The text body may be empty when the only change is a replacement image.
    if (Object.keys(data).length === 0 && !req.file) {
        throw ApiError.badRequest('Provide at least one field to update');
    }

    // Checked before any write, and the two cases stay distinct: 404 for an
    // unknown id, 403 for another company's (README.md's 401/403/404 rule).
    const existing = await assertPortfolioOwned(portfolioId, companyId);

    const updateData = omitUndefined(data);

    // No same-value early return here: Postgres unique indexes only compare
    // against *other* rows, so writing portfolioLink back to its current
    // value can never self-collide. Skipping the write was a micro-
    // optimization, not a correctness need — and with five editable fields
    // now, a check keyed on one of them would silently drop the rest of the
    // PATCH whenever that one field happened to be unchanged.
    const save = (portfolioImage?: string) =>
        prisma.servicePortfolio.update({
            where: {
                portfolioId,
                service: { listing: { companyId } },
            },
            data: {
                ...updateData,
                ...(portfolioImage ? { portfolioImage } : {}),
            },
            select: portfolioSelect,
        });

    // Multer keeps the file in memory; storage is not touched until ownership
    // is known. A replacement image takes the old one's place, and
    // saveWithUpload removes whichever file ends up unreferenced.
    let updated;
    try {
        updated = req.file
            ? await saveWithUpload(
                  req.file,
                  BUCKETS.PORTFOLIO,
                  'portfolios',
                  save,
                  existing.portfolioImage,
              )
            : await save();
    } catch (err) {
        const conflict = portfolioLinkConflict(err);
        if (conflict) throw conflict;
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
    const companyId = req.auth!.companyId;

    await assertPortfolioOwned(portfolioId, companyId);

    const deleted = await orNotFound(
        prisma.servicePortfolio.delete({
            where: {
                portfolioId,
                service: { listing: { companyId } },
            },
            select: { portfolioImage: true },
        }),
        'Portfolio not found',
    );

    // Best-effort cleanup of the image file: a failed remove logs but won't
    // block the 204, and the DB row is already gone either way.
    await removeFromStorageByUrl(deleted.portfolioImage, BUCKETS.PORTFOLIO);

    res.status(204).end();
}
// Public: Fetching a single portfolio item by ID (GET /portfolios/:portfolioId)
export async function getPortfolio(req: Request, res: Response): Promise<void> {
    const { portfolioId } = parseParams(portfolioIdParamSchema, req.params);

    const portfolio = await prisma.servicePortfolio.findUnique({
        where: { portfolioId },
        select: portfolioSelect,
    });

    if (!portfolio) {
        throw ApiError.notFound('Portfolio not found');
    }

    res.json(toServicePortfolio(portfolio));
}

// Public: fetching all portfolios, optionally narrowed to one service or one
// company (GET /portfolios?serviceId=123, ?companyId=4, or both).
export async function listPortfolios(
    req: Request,
    res: Response,
): Promise<void> {
    const { serviceId, companyId } = parseQuery(
        portfolioQuerySchema,
        req.query,
    );

    // One where object rather than a conditional spread of the whole key, so
    // the two filters can combine. An empty one matches everything.
    const portfolios = await prisma.servicePortfolio.findMany({
        where: {
            ...(serviceId ? { listingId: serviceId } : {}),
            ...(companyId ? { service: { listing: { companyId } } } : {}),
        },
        select: portfolioSelect,
        orderBy: { developmentDate: 'desc' },
    });

    res.json(portfolios.map(toServicePortfolio));
}
