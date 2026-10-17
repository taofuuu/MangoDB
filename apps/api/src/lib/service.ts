// listing_status is a plain VarChar(50) column with no DB enum, so this is the
// single source of truth for its values. Browse filters and proposal logic
// should import from here instead of hardcoding strings.
import type {
    CompanyBrief,
    ListingStatus,
    Service,
    ServiceFilterOptions,
    ServiceSummary,
} from '@mangodb/shared';
import { prisma } from './prisma';
import { ApiError } from './api-error';
import { companyBriefSelect, toCompanyBrief } from './company-profile';

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
} as const;

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
export async function resolveTechStack(names: string[]): Promise<string[]> {
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
} as const;

type SelectedService = {
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

export function toService(row: SelectedService): Service {
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

// Checked before any write, same split as assertPortfolioOwned (lib/
// portfolio.ts): 404 for an id that doesn't exist or isn't a SERVICE
// listing, 403 for one that exists but belongs to another company. A JOB
// listing with this id is treated as not-found here — it isn't this
// endpoint's resource, and 403 would wrongly confirm it exists.
export async function assertServiceOwned(
    serviceId: number,
    companyId: number,
): Promise<{ minBudget: number | null; maxBudget: number | null }> {
    const listing = await prisma.listing.findUnique({
        where: { listingId: serviceId },
        select: {
            companyId: true,
            listingType: true,
            minBudget: true,
            maxBudget: true,
        },
    });

    if (!listing || listing.listingType !== 'SERVICE') {
        throw ApiError.notFound('Service listing not found');
    }

    // companyId is nullable on an orphaned listing, which never equals a
    // real companyId, so that case lands on 403 without a branch of its own.
    if (listing.companyId !== companyId) {
        throw ApiError.forbidden('This listing belongs to another company');
    }

    return {
        minBudget: listing.minBudget,
        maxBudget: listing.maxBudget,
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
} as const;

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
