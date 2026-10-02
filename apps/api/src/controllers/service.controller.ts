import type { Request, Response } from 'express';
import type { Prisma } from '../generated/prisma/client';
import type { ListingStatus, ServiceListResponse } from '@mangodb/shared';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import { escapeLike } from '../lib/search';
import { isRecordNotFound } from '../lib/prismaErrors';
import {
    DEFAULT_LISTING_STATUS,
    assertListingOwned,
    listingSelect,
    serviceSummarySelect,
    toListing,
    toServiceSummary,
} from '../lib/service';
import { parseBody, parseParams, parseQuery } from '../middleware/validate';
import {
    createListingSchema,
    listingIdParamSchema,
    serviceListQuerySchema,
} from '../schemas/service.schema';

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

// US3-1. One word matches the service's title, description or category, or
// its company's name or tech stack, ignoring case.
function matchesKeyword(word: string): Prisma.ListingWhereInput {
    const contains = {
        contains: escapeLike(word),
        mode: 'insensitive',
    } as const;
    return {
        OR: [
            { listingTitle: contains },
            { listingDesc: contains },
            {
                listingCategory: {
                    some: { category: { catName: contains } },
                },
            },
            { company: { companyName: contains } },
            {
                company: {
                    provider: {
                        providerTechStack: {
                            some: { techStackName: contains },
                        },
                    },
                },
            },
        ],
    };
}

// US3-1. One page of open services for the search screen, newest first. count
// and findMany run in one transaction so the pagination matches the page.
export async function listServices(req: Request, res: Response): Promise<void> {
    const { q, page, pageSize } = parseQuery(serviceListQuerySchema, req.query);
    // Each word is matched on its own, so "react payment" finds a service
    // whose title says payment and whose company's stack has React.
    const words = q?.split(/\s+/).filter(Boolean) ?? [];
    // Search is discovery, so services of soft-deleted companies stay hidden.
    // A soft delete leaves their listings OPEN, so this filter is what does it.
    const where: Prisma.ListingWhereInput = {
        listingType: 'SERVICE',
        listingStatus: 'OPEN' satisfies ListingStatus,
        company: { deletedAt: null },
        ...(words.length > 0 && { AND: words.map(matchesKeyword) }),
    };
    const [totalItems, listings] = await prisma.$transaction([
        prisma.listing.count({ where }),
        prisma.listing.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            // listingId breaks ties, so two services created in the same
            // instant never swap places between pages.
            orderBy: [{ createdAt: 'desc' }, { listingId: 'desc' }],
            select: serviceSummarySelect,
        }),
    ]);

    const body: ServiceListResponse = {
        items: listings.map(toServiceSummary),
        pagination: {
            page,
            pageSize,
            totalItems,
            totalPages: Math.ceil(totalItems / pageSize),
        },
    };

    res.json(body);
}

export async function getMine(req: Request, res: Response): Promise<void> {
    if (!req.auth?.companyId) {
        throw ApiError.unauthorized('Company ID is required');
    }
    const { companyId } = req.auth;

    const listings = await prisma.listing.findMany({
        where: { companyId, listingType: 'SERVICE' }, // Defensive: explicit type filter
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
            listingType: 'SERVICE', // Defensive: explicit type filter
        },
        select: listingSelect,
    });

    if (!listing) {
        throw ApiError.notFound('Listing not found');
    }

    res.status(200).json(toListing(listing));
}

// DELETE /services/:listingId. Hard delete. listingCategory, the service row
// and any proposals on the listing cascade with it (prisma/schema.prisma
// onDelete: Cascade). A project blocks the delete instead (project ->
// proposal is onDelete: Restrict), so a service with projects is refused with
// 409 before the write (US2-4). Unlike portfolio there is no stored image to
// remove.
export async function deleteListing(
    req: Request,
    res: Response,
): Promise<void> {
    const { listingId } = parseParams(listingIdParamSchema, req.params);
    const { companyId } = req.auth!;

    // Checked before the write, same split as deletePortfolio: 404 for an
    // unknown/non-SERVICE id, 403 for another company's.
    await assertListingOwned(listingId, companyId);

    // US2-4: a service with at least one project linked to it can't be
    // deleted. A project links to the listing through its proposal.
    const projectCount = await prisma.project.count({
        where: { proposal: { listingId } },
    });
    if (projectCount > 0) {
        throw ApiError.conflict('A service with projects cannot be deleted');
    }

    try {
        await prisma.listing.delete({
            where: { listingId, companyId, listingType: 'SERVICE' },
        });
    } catch (err) {
        // Deleted between assertListingOwned and here.
        if (isRecordNotFound(err)) {
            throw ApiError.notFound('Service listing not found');
        }
        throw err;
    }

    res.status(204).end();
}
