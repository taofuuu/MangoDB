// listing_status is a plain VarChar(50) column with no DB enum, so this is the
// single source of truth for its values. Browse filters and proposal logic
// should import from here instead of hardcoding strings.
import type {
    CompanyBrief,
    ListingStatus,
    ListingType,
    Service,
    ServiceFilterOptions,
    ServiceSummary,
} from '@mangodb/shared';
import { prisma } from './prisma';
import { companyBriefSelect, toCompanyBrief } from './company-profile';
import { containsWord, splitWords } from './search';
import { categoryNameWhere, listingBudgetWhere } from './listing';
import { getRating, ratingSelect, type RatingSource } from './rating';
import type { Prisma } from '../generated/prisma/client';
import type { ServiceListQuery } from '../schemas/service.schema';

// The status a new service is created with. The allowed listing_status values
// live in packages/shared (LISTING_STATUSES, ADR 0010).
export const DEFAULT_LISTING_STATUS: ListingStatus = 'OPEN';

// ADR 0009. A service's tech names, read through its join table. Used as
// `service: serviceTechStackSelect` wherever a response shows a stack.
export const serviceTechStackSelect = {
    select: {
        serviceTechStack: {
            select: { techStack: { select: { techStackName: true } } },
        },
    },
} as const satisfies Prisma.ServiceDefaultArgs;

export type ServiceTechStackRow = {
    serviceTechStack: { techStack: { techStackName: string } }[];
} | null;

// Sorted: Prisma returns related rows in no fixed order. A listing with no
// service row has no stack.
export function toTechStackNames(service: ServiceTechStackRow): string[] {
    return (
        service?.serviceTechStack.map((t) => t.techStack.techStackName) ?? []
    ).sort();
}

// ADR 0009. The spelling to store for each tech name. One already in
// tech_stack is reused whatever its case, so "react" links to "React" instead
// of adding a second row. A new name keeps the case it was typed in.
async function resolveTechStack(names: string[]): Promise<string[]> {
    // "React" and "react" in one request are one tech, spelled as typed first.
    const typed = names.filter(
        (name, i) =>
            names.findIndex((n) => n.toLowerCase() === name.toLowerCase()) ===
            i,
    );
    if (typed.length === 0) return [];

    const existing = await prisma.techStack.findMany({
        where: { techStackName: { in: typed, mode: 'insensitive' } },
        select: { techStackName: true },
    });
    const stored = new Map(
        existing.map((t) => [t.techStackName.toLowerCase(), t.techStackName]),
    );
    return typed.map((name) => stored.get(name.toLowerCase()) ?? name);
}

// Both create and edit need the same two-stage catalog write from ADR 0009:
// resolve existing spelling first, then add only genuinely new names.
export async function ensureTechStack(names: string[]): Promise<string[]> {
    const techNames = await resolveTechStack(names);

    if (techNames.length > 0) {
        await prisma.techStack.createMany({
            data: techNames.map((techStackName) => ({ techStackName })),
            skipDuplicates: true,
        });
    }

    return techNames;
}

// The columns a service listing response may carry.
export const serviceSelect = {
    listingId: true,
    companyId: true,
    listingTitle: true,
    listingDesc: true,
    minBudget: true,
    maxBudget: true,
    listingStatus: true,
    listingCategory: { select: { categoryId: true } },
    service: serviceTechStackSelect,
    company: { select: companyBriefSelect },
} as const satisfies Prisma.ListingSelect;

type ServiceRow = {
    listingId: number;
    companyId: number | null;
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number | null;
    listingStatus: string;
    listingCategory: { categoryId: number }[];
    service: ServiceTechStackRow;
    company: CompanyBrief | null;
};

export function toService(row: ServiceRow): Service {
    return {
        // listing_id is the shared key under every listing; on the wire it
        // takes the resource's name, the way a job's is jobId.
        serviceId: row.listingId,
        company: toCompanyBrief(row.company),
        type: 'SERVICE',
        listingTitle: row.listingTitle,
        listingDesc: row.listingDesc,
        minBudget: row.minBudget,
        maxBudget: row.maxBudget,
        // Only ever written from LISTING_STATUSES (conventions §6).
        listingStatus: row.listingStatus as ListingStatus,
        categoryIds: row.listingCategory.map((c) => c.categoryId),
        techStack: toTechStackNames(row.service),
    };
}

// US3-1. Where one word may appear on a service itself: its title,
// description, a category or a tech name. The company search reuses it.
export function serviceTextMatches(word: string): Prisma.ListingWhereInput[] {
    const contains = containsWord(word);
    return [
        { listingTitle: contains },
        { listingDesc: contains },
        { listingCategory: { some: { category: { categoryName: contains } } } },
        {
            service: {
                serviceTechStack: {
                    some: { techStack: { techStackName: contains } },
                },
            },
        },
    ];
}

// US3-1. One word matches the service itself or its company's name.
export function serviceKeywordWhere(word: string): Prisma.ListingWhereInput {
    return {
        OR: [
            ...serviceTextMatches(word),
            { company: { companyName: containsWord(word) } },
        ],
    };
}

// Everything in the query but the keyword and paging, typed from the schema
// so a new filter is added in one place.
export type ServiceFilters = Omit<
    ServiceListQuery,
    'q' | 'orderBy' | 'page' | 'pageSize'
>;

// US3-2. Picking two names in one group finds services with either of them,
// so Web + Mobile widens the list. Each group used narrows it. Case is ignored,
// so a filter for "react" still finds a service that stored "React".
export function serviceFilterWhere({
    category = [],
    techStack = [],
    minPrice,
    maxPrice,
    companyId,
}: ServiceFilters): Prisma.ListingWhereInput[] {
    const where: Prisma.ListingWhereInput[] = [];
    // Only narrows: the OPEN and not-deleted rules in serviceSearchWhere still
    // apply, so a deleted company's id gives an empty page, not a 404.
    if (companyId !== undefined) {
        where.push({ companyId });
    }
    if (category.length > 0) {
        where.push(categoryNameWhere(category));
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
    // Price uses the shared overlap rule (listingBudgetWhere).
    where.push(
        ...listingBudgetWhere({ minBudget: minPrice, maxBudget: maxPrice }),
    );
    return where;
}

export type RatingSortOrder = Extract<
    ServiceListQuery['orderBy'],
    'ratingDesc' | 'ratingAsc'
>;

export function isRatingSortOrder(
    orderBy: ServiceListQuery['orderBy'],
): orderBy is RatingSortOrder {
    return orderBy === 'ratingDesc' || orderBy === 'ratingAsc';
}

// Ordering is applied in the database, before pagination. Price ordering uses
// the start of the service's range consistently in both directions. Missing
// prices sort last because "Contact for pricing" must not be presented as the
// cheapest option. listingId keeps pages stable when values tie.
export function serviceOrderBy(
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
        case 'ratingDesc':
        case 'ratingAsc':
            return [{ createdAt: 'desc' }, { listingId: 'desc' }];
    }
}

// US3-1. Which services the search may return. Search is discovery, so
// services of soft-deleted companies stay hidden: a soft delete leaves their
// listings OPEN, so this filter is what does it.
export function serviceSearchWhere({
    q,
    ...filters
}: ServiceFilters & { q?: string | undefined }): Prisma.ListingWhereInput {
    return {
        listingType: 'SERVICE' satisfies ListingType,
        listingStatus: 'OPEN' satisfies ListingStatus,
        company: { deletedAt: null },
        // T3.2.6. Keyword words and filters share one AND list, so a service
        // must pass all of them. Two AND keys would let one replace the other.
        AND: [
            ...splitWords(q).map(serviceKeywordWhere),
            ...serviceFilterWhere(filters),
        ],
    };
}

// US3-1. What one service search card needs. Only these company fields, never
// the whole row: it holds the sign-in email and password hash (ADR 0001).
export const serviceSummarySelect = {
    listingId: true,
    listingTitle: true,
    listingDesc: true,
    minBudget: true,
    maxBudget: true,
    listingCategory: {
        select: { category: { select: { categoryName: true } } },
    },
    service: serviceTechStackSelect,
    company: { select: companyBriefSelect },
} as const satisfies Prisma.ListingSelect;

// US3-3. Joins the Provider's completed-project reviews so rating sort can
// score each service's owner with getRating (same average helper as the
// profile).
export const serviceSummaryWithRatingSelect = {
    ...serviceSummarySelect,
    company: { select: { ...companyBriefSelect, ...ratingSelect } },
} as const satisfies Prisma.ListingSelect;

interface ServiceSummaryRow {
    listingId: number;
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number | null;
    listingCategory: { category: { categoryName: string } }[];
    service: ServiceTechStackRow;
    company: CompanyBrief | null;
}

// US3-3. Orders services by their Provider's averageRating using getRating.
// Unrated Providers (averageRating === null) sort last in both directions.
// Array.prototype.sort is stable in ES2019+, so rows already ordered by
// serviceOrderBy('newest') keep their newest-first tie-breaker.
export function sortServicesByRating<
    T extends { company: RatingSource | null },
>(rows: readonly T[], orderBy: RatingSortOrder): T[] {
    const scored = rows.map((row) => ({
        row,
        rating: row.company ? getRating(row.company).averageRating : null,
    }));

    scored.sort((a, b) => {
        if (a.rating === null && b.rating === null) return 0;
        if (a.rating === null) return 1;
        if (b.rating === null) return -1;
        return orderBy === 'ratingDesc'
            ? b.rating - a.rating
            : a.rating - b.rating;
    });

    return scored.map(({ row }) => row);
}

export function toServiceSummary(row: ServiceSummaryRow): ServiceSummary {
    return {
        serviceId: row.listingId,
        listingTitle: row.listingTitle,
        listingDesc: row.listingDesc,
        minBudget: row.minBudget,
        maxBudget: row.maxBudget,
        // Sorted: Prisma returns related rows in no fixed order.
        categories: row.listingCategory
            .map(({ category }) => category.categoryName)
            .sort(),
        techStack: toTechStackNames(row.service),
        company: toCompanyBrief(row.company),
    };
}

type ServiceFilterCategoryRow = { categoryName: string };
type ServiceFilterTechStackRow = { techStackName: string };

// Keeps the lookup endpoint's wire shape explicit instead of returning raw
// Prisma rows. Both input queries are ordered by name in the controller.
export function toServiceFilterOptions(
    categories: ServiceFilterCategoryRow[],
    techStack: ServiceFilterTechStackRow[],
): ServiceFilterOptions {
    return {
        categories: categories.map(({ categoryName }) => categoryName),
        techStack: techStack.map(({ techStackName }) => techStackName),
    };
}
