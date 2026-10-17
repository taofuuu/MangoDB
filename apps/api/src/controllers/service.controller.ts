import type { Request, Response } from 'express';
import type { Prisma } from '../generated/prisma/client';
import type { ListingStatus, Paginated, ServiceSummary } from '@mangodb/shared';
import { prisma } from '../lib/prisma';
import { pageArgs, toPagination } from '../lib/pagination';
import { ApiError } from '../lib/api-error';
import { assertCategoriesExist } from '../lib/category';
import { escapeLike } from '../lib/search';
import { isRecordNotFound } from '../lib/prisma-errors';
import { removeFromStorageByUrl, BUCKETS } from '../lib/storage';
import { omitUndefined } from '../lib/objects';
import {
    DEFAULT_LISTING_STATUS,
    assertServiceOwned,
    ensureTechStack,
    serviceSelect,
    serviceSummarySelect,
    toServiceFilterOptions,
    toService,
    toServiceSummary,
} from '../lib/service';
import { parseBody, parseParams, parseQuery } from '../middleware/validate';
import {
    createServiceSchema,
    serviceIdParamSchema,
    SERVICE_BUDGET_RANGE_ERROR,
    type ServiceListQuery,
    serviceListQuerySchema,
    serviceMineQuerySchema,
    updateServiceSchema,
} from '../schemas/service.schema';
import { minBudgetDoesNotExceedMax } from '../schemas/common.schema';

// Create and publish a service listing (provider-only; see routes).
// Validates body, verifies category existence, and creates listing + service
// atomically in one nested write.
export async function createService(
    req: Request,
    res: Response,
): Promise<void> {
    const data = parseBody(createServiceSchema, req.body);
    const { companyId } = req.auth!;

    const catIds = [...new Set(data.categoryIds)];
    await assertCategoriesExist(catIds);

    const techNames = await ensureTechStack(data.techStack);

    const created = await prisma.listing.create({
        data: {
            companyId,
            listingTitle: data.listingTitle,
            listingDesc: data.listingDesc,
            minBudget: data.minBudget ?? null,
            maxBudget: data.maxBudget ?? null,
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
                          create: catIds.map((categoryId) => ({ categoryId })),
                      },
                  }
                : {}),
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
    const existing = await assertServiceOwned(serviceId, companyId);

    const sentBudget =
        body.minBudget !== undefined || body.maxBudget !== undefined;
    if (
        sentBudget &&
        !minBudgetDoesNotExceedMax({
            ...existing,
            ...omitUndefined(body),
        })
    ) {
        const field = body.minBudget === undefined ? 'maxBudget' : 'minBudget';
        throw ApiError.validationFailed([
            { field, message: SERVICE_BUDGET_RANGE_ERROR },
        ]);
    }

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
    try {
        const updated = await prisma.listing.update({
            // Recheck owner and type in the write in case the row changed
            // between the authorization read and this operation.
            where: { listingId: serviceId, companyId, listingType: 'SERVICE' },
            data: {
                ...omitUndefined(listingFields),
                ...(categoryIds !== undefined
                    ? {
                          listingCategory: {
                              deleteMany: {},
                              create: [...new Set(categoryIds)].map(
                                  (categoryId) => ({
                                      categoryId,
                                  }),
                              ),
                          },
                      }
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
        });

        res.json(toService(updated));
    } catch (err) {
        if (isRecordNotFound(err)) {
            throw ApiError.notFound('Service listing not found');
        }
        throw err;
    }
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
                    some: { category: { categoryName: contains } },
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
type ServiceFilters = Omit<
    ServiceListQuery,
    'q' | 'orderBy' | 'page' | 'pageSize'
>;

// US3-2. Picking two names in one group finds services with either of them,
// so Web + Mobile widens the list. Each group used narrows it. Case is ignored,
// so a filter for "react" still finds a service that stored "React".
function matchesFilters({
    category = [],
    techStack = [],
    minPrice,
    maxPrice,
    companyId,
}: ServiceFilters): Prisma.ListingWhereInput[] {
    const where: Prisma.ListingWhereInput[] = [];
    // Only narrows: the OPEN and not-deleted rules in listServices still
    // apply, so a deleted company's id gives an empty page, not a 404.
    if (companyId !== undefined) {
        where.push({ companyId });
    }
    if (category.length > 0) {
        where.push({
            listingCategory: {
                some: {
                    category: {
                        categoryName: { in: category, mode: 'insensitive' },
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
    // possible somewhere inside both. A one-sided range is open-ended only on
    // its missing side; a service with no price at all cannot match a filter.
    if (maxPrice !== undefined) {
        // Its lowest price fits under the slider's max.
        where.push({ minBudget: { lte: maxPrice } });
    }
    if (minPrice !== undefined) {
        // Its highest price reaches the slider's min.
        where.push({
            OR: [
                { maxBudget: { gte: minPrice } },
                // A declared minimum with no upper limit can still reach the
                // requested threshold. An entirely unpriced service cannot.
                {
                    AND: [{ minBudget: { not: null } }, { maxBudget: null }],
                },
            ],
        });
    }
    return where;
}

// Ordering is applied in the database, before pagination. Price ordering uses
// the start of the service's range consistently in both directions. Missing
// prices sort last because "Contact for pricing" must not be presented as the
// cheapest option. listingId keeps pages stable when values tie.
function serviceOrderBy(
    orderBy: ServiceListQuery['orderBy'],
): Prisma.ListingOrderByWithRelationInput[] {
    switch (orderBy) {
        case 'priceAsc':
            return [
                { minBudget: { sort: 'asc', nulls: 'last' } },
                { maxBudget: { sort: 'asc', nulls: 'last' } },
                { listingId: 'desc' },
            ];
        case 'priceDesc':
            return [
                { minBudget: { sort: 'desc', nulls: 'last' } },
                { maxBudget: { sort: 'desc', nulls: 'first' } },
                { listingId: 'desc' },
            ];
        case 'newest':
            return [{ createdAt: 'desc' }, { listingId: 'desc' }];
    }
}

// US3-1. One page of open services for the search screen in the requested
// order. count and findMany run in one transaction so the pagination matches
// the page.
export async function listServices(req: Request, res: Response): Promise<void> {
    const { q, orderBy, page, pageSize, ...filters } = parseQuery(
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
                                listingType: 'SERVICE',
                                listingStatus: 'OPEN',
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
    if (!req.auth?.companyId) {
        throw ApiError.unauthorized('Company ID is required');
    }
    const { companyId } = req.auth;
    const { status } = parseQuery(serviceMineQuerySchema, req.query);

    const listings = await prisma.listing.findMany({
        where: {
            companyId,
            listingType: 'SERVICE', // Defensive: explicit type filter
            ...(status ? { listingStatus: status } : {}),
        },
        orderBy: { createdAt: 'desc' },
        select: serviceSelect,
    });

    res.status(200).json(listings.map(toService));
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
            listingType: 'SERVICE', // Defensive: explicit type filter
            company: { deletedAt: null },
        },
        select: serviceSelect,
    });

    if (!listing) {
        throw ApiError.notFound('Listing not found');
    }

    if (
        listing.listingStatus !== ('OPEN' satisfies ListingStatus) &&
        listing.companyId !== companyId
    ) {
        throw ApiError.notFound('Listing not found');
    }

    res.status(200).json(toService(listing));
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
    await assertServiceOwned(serviceId, companyId);

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

    try {
        await prisma.listing.delete({
            where: { listingId: serviceId, companyId, listingType: 'SERVICE' },
        });
    } catch (err) {
        // Deleted between assertServiceOwned and here.
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
