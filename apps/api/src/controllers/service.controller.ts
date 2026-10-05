import type { Request, Response } from 'express';
import type { Prisma } from '../generated/prisma/client';
import type { ListingStatus, ServiceListResponse } from '@mangodb/shared';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import { escapeLike } from '../lib/search';
import { isRecordNotFound } from '../lib/prismaErrors';
import { removeFromStorageByUrl, BUCKETS } from '../lib/storage';
import {
    DEFAULT_LISTING_STATUS,
    assertListingOwned,
    listingSelect,
    resolveTechStack,
    serviceSummarySelect,
    toListing,
    toServiceSummary,
} from '../lib/service';
import { parseBody, parseParams, parseQuery } from '../middleware/validate';
import {
    createListingSchema,
    listingIdParamSchema,
    type ServiceListQuery,
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

    const techNames = await resolveTechStack(data.techStack);

    // ADR 0009. Add any new names first. skipDuplicates is ON CONFLICT DO
    // NOTHING, so two requests adding the same new name at once both succeed.
    if (techNames.length > 0) {
        await prisma.techStack.createMany({
            data: techNames.map((techStackName) => ({ techStackName })),
            skipDuplicates: true,
        });
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
            // ADR 0009. Each tech links to its tech_stack row, added above.
            service: {
                create: {
                    serviceTechStack: {
                        create: techNames.map((techStackName) => ({
                            techStack: { connect: { techStackName } },
                        })),
                    },
                },
            },
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

// US3-1. One word matches the service's title, description, category or tech
// stack, or its company's name, ignoring case.
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
            {
                service: {
                    serviceTechStack: {
                        some: { techStack: { techStackName: contains } },
                    },
                },
            },
            { company: { companyName: contains } },
        ],
    };
}

// Everything in the query but the keyword and paging, typed from the schema
// so a new filter is added in one place.
type ServiceFilters = Omit<ServiceListQuery, 'q' | 'page' | 'pageSize'>;

// US3-2. Picking two names in one group finds services with either of them,
// so Web + Mobile widens the list. Each group used narrows it. Case is ignored,
// so a filter for "react" still finds a service that stored "React".
function matchesFilters({
    category = [],
    techStack = [],
    minPrice,
    maxPrice,
}: ServiceFilters): Prisma.ListingWhereInput[] {
    const where: Prisma.ListingWhereInput[] = [];
    if (category.length > 0) {
        where.push({
            listingCategory: {
                some: {
                    category: {
                        catName: { in: category, mode: 'insensitive' },
                    },
                },
            },
        });
    }
    if (techStack.length > 0) {
        // ADR 0009: the service's own stack, not its company's.
        where.push({
            service: {
                serviceTechStack: {
                    some: {
                        techStack: {
                            techStackName: {
                                in: techStack,
                                mode: 'insensitive',
                            },
                        },
                    },
                },
            },
        });
    }
    // Price keeps a service whose range overlaps the slider's, so a deal is
    // possible somewhere inside both. An empty budget counts as open-ended,
    // so it never rules a service out on its own.
    if (maxPrice !== undefined) {
        // Its lowest price fits under the slider's max.
        where.push({
            OR: [{ minBudget: null }, { minBudget: { lte: maxPrice } }],
        });
    }
    if (minPrice !== undefined) {
        // Its highest price reaches the slider's min.
        where.push({
            OR: [{ maxBudget: null }, { maxBudget: { gte: minPrice } }],
        });
    }
    return where;
}

// US3-1. One page of open services for the search screen, newest first. count
// and findMany run in one transaction so the pagination matches the page.
export async function listServices(req: Request, res: Response): Promise<void> {
    const { q, page, pageSize, ...filters } = parseQuery(
        serviceListQuerySchema,
        req.query,
    );
    // Each word is matched on its own, so "react payment" finds a service
    // whose title says payment and whose company's stack has React.
    const words = q?.split(/\s+/).filter(Boolean) ?? [];
    // Search is discovery, so services of soft-deleted companies stay hidden.
    // A soft delete leaves their listings OPEN, so this filter is what does it.
    const where: Prisma.ListingWhereInput = {
        listingType: 'SERVICE',
        listingStatus: 'OPEN' satisfies ListingStatus,
        company: { deletedAt: null },
        // T3.2.6. Keyword words and filters share one AND list, so a service
        // must pass all of them. Two AND keys would let one replace the other.
        AND: [...words.map(matchesKeyword), ...matchesFilters(filters)],
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

    // A service may carry zero or more portfolio items. service_portfolio
    // cascades with the listing (prisma/schema.prisma), so the DB rows
    // vanish on their own — but their files in storage do not, so every
    // image URL is read here, before the write, the same way deletePortfolio
    // reads one before deleting a single item.
    const portfolios = await prisma.servicePortfolio.findMany({
        where: { listingId },
        select: { portfolioImage: true },
    });

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

    // Best-effort cleanup of every portfolio image file: a failed remove
    // logs but won't block the 204, and the DB rows are already gone either
    // way — same trade-off deletePortfolio makes for a single image.
    await Promise.all(
        portfolios.map((p) =>
            removeFromStorageByUrl(p.portfolioImage, BUCKETS.PORTFOLIO),
        ),
    );

    res.status(204).end();
}
