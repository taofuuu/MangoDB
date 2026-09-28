import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import {
    DEFAULT_LISTING_STATUS,
    listingSelect,
    toListing,
} from '../lib/listing';
import { parseBody } from '../middleware/validate';
import { createListingSchema } from '../schemas/listing.schema';

export async function createListing(req: Request, res: Response): Promise {
    // 1. Validate body
    const data = parseBody(createListingSchema, req.body);
    let companyId = req.auth?.companyId;

    // Fallback: If companyId is not in JWT payload, resolve from DB via sub
    if (!companyId && req.auth?.sub) {
        const targetId = Number(req.auth.sub);
        if (!isNaN(targetId)) {
            const existingCompany = await prisma.company.findUnique({
                where: { companyId: targetId },
                select: { companyId: true },
            });
            if (existingCompany) {
                companyId = existingCompany.companyId;
            }
        }
    }

    // Ensure companyId is found before attempting DB creation
    if (!companyId) {
        throw ApiError.unauthorized('Company ID could not be identified');
    }

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

    // Safe fallback for status if DEFAULT_LISTING_STATUS is undefined
    const status = DEFAULT_LISTING_STATUS || 'OPEN';

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
                listingStatus: status,
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
