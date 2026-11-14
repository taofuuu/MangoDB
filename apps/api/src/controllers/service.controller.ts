import type { Request, Response } from 'express';
import type {
    ListingStatus,
    ListingType,
    Paginated,
    ServiceSummary,
} from '@mangodb/shared';
import { prisma } from '../lib/prisma';
import { pageArgs, toPagination } from '../lib/pagination';
import { ApiError } from '../lib/api-error';
import { assertCategoriesExist } from '../lib/category';
import { orNotFound } from '../lib/prisma-errors';
import { removeFromStorageByUrl, BUCKETS } from '../lib/storage';
import { omitUndefined } from '../lib/objects';
import {
    assertBudgetRange,
    assertListingOwned,
    assertListingVisible,
    LISTING_MESSAGES,
    categoryCreate,
    categoryReplace,
} from '../lib/listing';
import {
    DEFAULT_LISTING_STATUS,
    ensureTechStack,
    isRatingSortOrder,
    serviceOrderBy,
    serviceSearchWhere,
    serviceSelect,
    serviceSummarySelect,
    sortServicesByRating,
    toServiceFilterOptions,
    toService,
    toServiceSummary,
} from '../lib/service';
import { parseBody, parseParams, parseQuery } from '../middleware/validate';
import {
    createServiceSchema,
    serviceIdParamSchema,
    serviceListQuerySchema,
    serviceMineQuerySchema,
    updateServiceSchema,
} from '../schemas/service.schema';
import { BUDGET_RANGE_ERROR } from '../schemas/listing.schema';

// Create and publish a service listing (provider-only; see routes).
// Validates body, verifies category existence, and creates listing + service
// atomically in one nested write.
export async function createService(
    req: Request,
    res: Response,
): Promise<void> {
    const data = parseBody(createServiceSchema, req.body);
    const { companyId } = req.auth!;

    const categoryIds = data.categoryIds ?? [];
    await assertCategoriesExist(categoryIds);

    const techNames = await ensureTechStack(data.techStack ?? []);

    const created = await prisma.listing.create({
        data: {
            companyId,
            listingTitle: data.listingTitle,
            listingDesc: data.listingDesc,
            minBudget: data.minBudget ?? null,
            maxBudget: data.maxBudget ?? null,
            listingStatus: DEFAULT_LISTING_STATUS,
            listingType: 'SERVICE' satisfies ListingType,
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
            listingCategory: categoryCreate(categoryIds),
        },
        select: serviceSelect,
    });

    res.status(201).json(toService(created));
}

// T2.3.4–T2.3.5. Update only submitted fields and replace submitted relation
// sets. Ownership is checked before category, tech-stack, or listing writes.
export async function updateService(
    req: Request,
    res: Response,
): Promise<void> {
    const { serviceId } = parseParams(serviceIdParamSchema, req.params);
    const body = parseBody(updateServiceSchema, req.body);
    const { companyId } = req.auth!;

    // 404 for an unknown/non-service id; 403 for another provider's service.
    const existing = await assertListingOwned(serviceId, 'SERVICE', companyId);
    assertBudgetRange(existing, body, BUDGET_RANGE_ERROR);

    if (body.categoryIds !== undefined) {
        await assertCategoriesExist(body.categoryIds);
    }

    let techNames: string[] | undefined;
    if (body.techStack !== undefined) {
        techNames = await ensureTechStack(body.techStack);
    }

    const { categoryIds, techStack: _techStack, ...listingFields } = body;
    const techStackCreates = techNames?.map((techStackName) => ({
        techStack: { connect: { techStackName } },
    }));
    const updated = await orNotFound(
        prisma.listing.update({
            // Recheck owner and type in the write in case the row changed
            // between the authorization read and this operation.
            where: {
                listingId: serviceId,
                companyId,
                listingType: 'SERVICE' satisfies ListingType,
            },
            data: {
                ...omitUndefined(listingFields),
                ...(categoryIds !== undefined
                    ? { listingCategory: categoryReplace(categoryIds) }
                    : {}),
                ...(techStackCreates !== undefined
                    ? {
                          service: {
                              upsert: {
                                  create: {
                                      serviceTechStack: {
                                          create: techStackCreates,
                                      },
                                  },
                                  update: {
                                      serviceTechStack: {
                                          deleteMany: {},
                                          create: techStackCreates,
                                      },
                                  },
                              },
                          },
                      }
                    : {}),
            },
            select: serviceSelect,
        }),
        LISTING_MESSAGES.SERVICE.notFound,
    );

    res.json(toService(updated));
}

// US3-1. One page of open services for the search screen in the requested
// order. count and findMany run in one transaction so the pagination matches
// the page.
export async function listServices(req: Request, res: Response): Promise<void> {
    const { q, orderBy, page, pageSize, ...filters } = parseQuery(
        serviceListQuerySchema,
        req.query,
    );
    const where = serviceSearchWhere({ q, ...filters });
    // shortcut: sorts every match in memory, fine for a few hundred services;
    // move the rating sort into SQL if search gets slow.
    if (isRatingSortOrder(orderBy)) {
        const listings = await prisma.listing.findMany({
            where,
            orderBy: serviceOrderBy(orderBy),
            select: serviceSummarySelect,
        });
        const sorted = sortServicesByRating(listings, orderBy);
        const { skip, take } = pageArgs({ page, pageSize });
        const body: Paginated<ServiceSummary> = {
            items: sorted.slice(skip, skip + take).map(toServiceSummary),
            pagination: toPagination(sorted.length, { page, pageSize }),
        };
        res.json(body);
        return;
    }

    const [totalItems, listings] = await prisma.$transaction([
        prisma.listing.count({ where }),
        prisma.listing.findMany({
            where,
            ...pageArgs({ page, pageSize }),
            // listingId breaks ties, so two services created in the same
            // instant never swap places between pages.
            orderBy: serviceOrderBy(orderBy),
            select: serviceSummarySelect,
        }),
    ]);

    const body: Paginated<ServiceSummary> = {
        items: listings.map(toServiceSummary),
        pagination: toPagination(totalItems, { page, pageSize }),
    };

    res.json(body);
}

// T3.2.2. Categories are the fixed catalog. Tech stacks are open-ended, so
// only the database can provide an accurate list; include names attached to
// services that discovery can actually return.
export async function getServiceFilterOptions(
    _req: Request,
    res: Response,
): Promise<void> {
    const [categories, techStack] = await prisma.$transaction([
        prisma.category.findMany({
            orderBy: { categoryName: 'asc' },
            select: { categoryName: true },
        }),
        prisma.techStack.findMany({
            where: {
                serviceTechStack: {
                    some: {
                        service: {
                            listing: {
                                listingType: 'SERVICE' satisfies ListingType,
                                listingStatus: 'OPEN' satisfies ListingStatus,
                                company: { deletedAt: null },
                            },
                        },
                    },
                },
            },
            orderBy: { techStackName: 'asc' },
            select: { techStackName: true },
        }),
    ]);

    res.json(toServiceFilterOptions(categories, techStack));
}

export async function listMyServices(
    req: Request,
    res: Response,
): Promise<void> {
    const { companyId } = req.auth!;
    const { status } = parseQuery(serviceMineQuerySchema, req.query);

    const listings = await prisma.listing.findMany({
        where: {
            companyId,
            listingType: 'SERVICE' satisfies ListingType,
            ...(status ? { listingStatus: status } : {}),
        },
        orderBy: { createdAt: 'desc' },
        select: serviceSelect,
    });

    res.json(listings.map(toService));
}

// GET /services/:serviceId. Any company can read an OPEN service of an active
// company, with the owner's name. The owner reads its own in any status.
// Everything else is 404: a non-open service is private to its owner, so to
// anyone else it does not exist (docs/conventions.md, 403 vs 404).
export async function getService(req: Request, res: Response): Promise<void> {
    const { companyId } = req.auth!;
    const { serviceId } = parseParams(serviceIdParamSchema, req.params);

    // A soft-deleted company's services stay in the table, still OPEN, so the
    // where hides them here, the same as in the search.
    const listing = await prisma.listing.findUnique({
        where: {
            listingId: serviceId,
            listingType: 'SERVICE' satisfies ListingType,
            company: { deletedAt: null },
        },
        select: serviceSelect,
    });

    res.json(toService(assertListingVisible(listing, companyId, 'SERVICE')));
}

// DELETE /services/:serviceId. Hard delete. listingCategory, the service row
// and any proposals on the listing cascade with it (prisma/schema.prisma
// onDelete: Cascade). A project blocks the delete instead (project ->
// proposal is onDelete: Restrict), so a service with projects is refused with
// 409 before the write (US2-4). Unlike portfolio there is no stored image to
// remove.
export async function deleteService(
    req: Request,
    res: Response,
): Promise<void> {
    const { serviceId } = parseParams(serviceIdParamSchema, req.params);
    const { companyId } = req.auth!;

    // Checked before the write, same split as deletePortfolio: 404 for an
    // unknown/non-SERVICE id, 403 for another company's.
    await assertListingOwned(serviceId, 'SERVICE', companyId);

    // US2-4: a service with at least one project linked to it can't be
    // deleted. A project links to the listing through its proposal.
    const projectCount = await prisma.project.count({
        where: { proposal: { listingId: serviceId } },
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
        where: { listingId: serviceId },
        select: { portfolioImage: true },
    });

    // A 404 if it was deleted between the ownership check and here.
    await orNotFound(
        prisma.listing.delete({
            where: {
                listingId: serviceId,
                companyId,
                listingType: 'SERVICE' satisfies ListingType,
            },
        }),
        LISTING_MESSAGES.SERVICE.notFound,
    );

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
