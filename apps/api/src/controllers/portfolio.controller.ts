import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import {
    assertPortfolioOwned,
    portfolioSelect,
    toServicePortfolio,
} from '../lib/portfolio';

import {
    uploadToStorage,
    removeFromStorage,
    removeFromStorageByUrl,
    BUCKETS,
} from '../lib/storage';

import { omitUndefined } from '../lib/objects';
import {
    isRecordNotFound,
    uniqueViolationDetails,
    uniqueViolationFields,
} from '../lib/prismaErrors';
import { parseBody, parseParams, parseQuery } from '../middleware/validate';
import {
    PORTFOLIO_UNIQUE_FIELDS,
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
    // 1. ตรวจสอบว่าส่งไฟล์รูปมาหรือไม่
    if (!req.file) {
        throw ApiError.badRequest('Portfolio image file is required');
    }

    // 2. Parse Text Fields จาก Form-Data
    const data = parseBody(createPortfolioSchema, req.body);
    const companyId = req.auth!.companyId;

    // 3. AUTHORIZATION & OWNERSHIP CHECK ก่อนทำการ Upload ไฟล์
    const service = await prisma.service.findUnique({
        where: { listingId: data.listingId },
        select: { listing: { select: { companyId: true } } },
    });

    if (!service) {
        throw ApiError.notFound('Service listing not found');
    }

    if (service.listing.companyId !== companyId) {
        throw ApiError.forbidden('This service belongs to another company');
    }

    // 4. เมื่อผ่านการตรวจสิทธิ์แล้ว จึงสั่ง Upload ไฟล์ขึ้น Supabase Storage (bucket: portfolio)
    const image = await uploadToStorage(
        req.file,
        BUCKETS.PORTFOLIO,
        'portfolios',
    );

    // 5. บันทึกลง Database
    let created;
    try {
        created = await prisma.servicePortfolio.create({
            data: {
                portfolioName: data.portfolioName,
                portfolioDescription: data.portfolioDescription ?? null,
                developmentDate: data.developmentDate,
                portfolioImage: image.url,
                portfolioLink: data.portfolioLink,
                service: {
                    connect: {
                        listingId: data.listingId,
                    },
                },
            },
            select: portfolioSelect,
        });
    } catch (err) {
        await removeFromStorage(image.path, BUCKETS.PORTFOLIO);

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
    const companyId = req.auth!.companyId;

    // The text body may be empty when the only change is a replacement image.
    if (Object.keys(data).length === 0 && !req.file) {
        throw ApiError.badRequest('Provide at least one field to update');
    }

    // Checked before any write, and the two cases stay distinct: 404 for an
    // unknown id, 403 for another company's (README.md's 401/403/404 rule).
    const existing = await assertPortfolioOwned(portfolioId, companyId);

    // Multer keeps the file in memory; storage is not touched until ownership
    // is known. If the database write later fails, the new upload is removed.
    const replacement = req.file
        ? await uploadToStorage(req.file, BUCKETS.PORTFOLIO, 'portfolios')
        : null;

    const updateData = omitUndefined(data);
    if (updateData.portfolioDescription === '') {
        updateData.portfolioDescription = null;
    }

    // No same-value early return here: Postgres unique indexes only compare
    // against *other* rows, so writing portfolioLink back to its current
    // value can never self-collide. Skipping the write was a micro-
    // optimization, not a correctness need — and with five editable fields
    // now, a check keyed on one of them would silently drop the rest of the
    // PATCH whenever that one field happened to be unchanged.
    let updated;
    try {
        updated = await prisma.servicePortfolio.update({
            where: {
                portfolioId,
                service: { listing: { companyId } },
            },
            data: {
                ...updateData,
                ...(replacement ? { portfolioImage: replacement.url } : {}),
            },
            select: portfolioSelect,
        });
    } catch (err) {
        if (replacement) {
            await removeFromStorage(replacement.path, BUCKETS.PORTFOLIO);
        }

        // @@unique([listingId, portfolioLink]) — this listing already
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

    // The row points at the replacement now, so the old object is no longer
    // needed. Cleanup is best-effort, matching portfolio deletion.
    if (replacement) {
        await removeFromStorageByUrl(
            existing.portfolioImage,
            BUCKETS.PORTFOLIO,
        );
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

    let deleted;
    try {
        deleted = await prisma.servicePortfolio.delete({
            where: {
                portfolioId,
                service: { listing: { companyId } },
            },
            select: { portfolioImage: true },
        });
    } catch (err) {
        if (isRecordNotFound(err)) {
            throw ApiError.notFound('Portfolio not found');
        }
        throw err;
    }

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

// Public: fetching all portfolios, optionally narrowed to one listing or one
// company (GET /portfolios?listingId=123, ?companyId=4, or both).
export async function getAllPortfolios(
    req: Request,
    res: Response,
): Promise<void> {
    const { listingId, companyId } = parseQuery(
        portfolioQuerySchema,
        req.query,
    );

    // One where object rather than a conditional spread of the whole key, so
    // the two filters can combine. An empty one matches everything.
    const portfolios = await prisma.servicePortfolio.findMany({
        where: {
            ...(listingId ? { listingId } : {}),
            ...(companyId ? { service: { listing: { companyId } } } : {}),
        },
        select: portfolioSelect,
        orderBy: { developmentDate: 'desc' },
    });

    res.json(portfolios.map(toServicePortfolio));
}
