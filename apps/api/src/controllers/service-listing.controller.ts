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

export async function createListing(
    req: Request,
    res: Response,
): Promise<void> {
    // 1. Validate body
    const data = parseBody(createListingSchema, req.body);
    const { companyId } = req.auth!;

    // 2. Validate categories
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

    // 3. Sequential creation inside explicit transaction
    const created = await prisma.$transaction(async (tx) => {
        // Step 3a: Create Listing
        const listing = await tx.listing.create({
            data: {
                companyId: companyId,
                listingTitle: data.listingTitle,
                listingDesc: data.listingDesc,
                minBudget: data.minBudget ?? null,
                maxBudget: data.maxBudget,
                listingStatus: DEFAULT_LISTING_STATUS,
                listingType: data.type,
            },
        });

        // Step 3b: Create ListingCategory relations
        if (catIds.length > 0) {
            await tx.listingCategory.createMany({
                data: catIds.map((catId) => ({
                    listingId: listing.listingId,
                    catId,
                })),
            });
        }

        // Step 3c: Create Service or JobRequirement
        if (data.type === 'SERVICE') {
            await tx.service.create({
                data: {
                    listingId: listing.listingId,
                },
            });
        } else {
            await tx.jobRequirement.create({
                data: {
                    listingId: listing.listingId,
                    locationPref: data.jobRequirement?.locationPref ?? null,
                    duration: data.jobRequirement?.duration ?? null,
                    deadline: data.jobRequirement?.deadline ?? null,
                },
            });
        }

        // Step 3d: Return fully mapped listing
        return tx.listing.findUniqueOrThrow({
            where: { listingId: listing.listingId },
            select: listingSelect,
        });
    });

    res.status(201).json(toListing(created));
}

export async function getMine(req: Request, res: Response): Promise<void> {
    if (!req.auth?.companyId) {
        throw ApiError.unauthorized('Company ID is required');
    }
    const { companyId } = req.auth;

    const listings = await prisma.listing.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        select: listingSelect,
    });

    res.status(200).json(listings.map(toListing));
}

export async function getService(req: Request, res: Response): Promise<void> {
    const { companyId } = req.auth!;
    const listingId = Number(req.params.listingId);

    if (isNaN(listingId)) {
        throw ApiError.badRequest('Invalid listing ID format');
    }

    const listing = await prisma.listing.findFirst({
        where: {
            listingId,
            companyId,
        },
        select: listingSelect,
    });

    if (!listing) {
        throw ApiError.notFound('Listing not found');
    }

    res.status(200).json(toListing(listing));
}
