import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import {
    DEFAULT_LISTING_STATUS,
    listingSelect,
    toListing,
} from '../lib/servicelisting';
import { parseBody } from '../middleware/validate';
import { createListingSchema } from '../schemas/service-listing.schema';

// Create and publish a service listing (provider-only; see routes).
// Validates body, verifies category existence, and creates listing + service
// atomically in one nested write.
export async function createListing(
    req: Request,
    res: Response,
): Promise<void> {
    const data = parseBody(createListingSchema, req.body);
    const { companyId } = req.auth!;

    const catIds = [...new Set(data.categoryIds)];
    if (catIds.length > 0) {
        const found = await prisma.category.findMany({
            where: { catId: { in: catIds } },
            select: { catId: true },
        });
        const foundIds = new Set(found.map((c) => c.catId));
        const missing = catIds.filter((id) => !foundIds.has(id));
        if (missing.length > 0) {
            throw ApiError.validationFailed([
                {
                    field: 'categoryIds',
                    message: `Unknown category id(s): ${missing.join(', ')}`,
                },
            ]);
        }
    }

    const created = await prisma.listing.create({
        data: {
            companyId,
            listingTitle: data.listingTitle,
            listingDesc: data.listingDesc,
            minBudget: data.minBudget ?? null,
            maxBudget: data.maxBudget,
            listingStatus: DEFAULT_LISTING_STATUS,
            listingType: 'SERVICE',
            service: { create: {} },
            ...(catIds.length > 0
                ? {
                      listingCategory: {
                          create: catIds.map((catId) => ({ catId })),
                      },
                  }
                : {}),
        },
        select: listingSelect,
    });

    res.status(201).json(toListing(created));
}
