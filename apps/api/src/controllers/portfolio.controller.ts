import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import {
    assertPortfolioOwned,
    portfolioSelect,
    toServicePortfolio,
} from '../lib/portfolio';
import { uploadToStorage } from '../lib/storage';
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
    const companyId = Number(req.auth!.sub);

    // 3. AUTHORIZATION & OWNERSHIP CHECK ก่อนทำการ Upload ไฟล์
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

    // 4. เมื่อผ่านการตรวจสิทธิ์แล้ว จึงสั่ง Upload ไฟล์ขึ้น Supabase Storage (bucket: portfolio)
    const imageUrl = await uploadToStorage(req.file);

    // 5. บันทึกลง Database
    let created;
    try {
        created = await prisma.service_portfolio.create({
            data: {
                portfolio_name: data.portfolio_name,
                portfolio_description: data.portfolio_description ?? null,
                development_date: data.development_date,
                portfolio_image: image.url,
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
        await removeFromStorage(image.path);

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

// Editing a work sample - คงเดิมไม่แก้ไข
export async function updatePortfolio(
    req: Request,
    res: Response,
): Promise<void> {
    const { portfolioId } = parseParams(portfolioIdParamSchema, req.params);
    const data = parseBody(updatePortfolioSchema, req.body);
    const companyId = Number(req.auth!.sub);

    await assertPortfolioOwned(portfolioId, companyId);

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
        const fields = uniqueViolationFields(err, PORTFOLIO_UNIQUE_FIELDS);
        if (fields) {
            throw ApiError.conflict(
                'This listing already has that portfolio link',
                uniqueViolationDetails(fields),
            );
        }
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
        if (isRecordNotFound(err)) {
            throw ApiError.notFound('Portfolio not found');
        }
        throw err;
    }

    res.status(204).end();
}