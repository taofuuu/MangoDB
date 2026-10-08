// listing_status is a plain VarChar(50) column with no DB enum, so this is the
// single source of truth for its values. Browse filters and proposal logic
// should import from here instead of hardcoding strings.
import type { ListingStatus, ServiceListing, ServiceSummary } from '@mangodb/shared';
import { LISTING_STATUSES } from '@mangodb/shared';
import { prisma } from './prisma';
import { ApiError } from './ApiError';

export const DEFAULT_LISTING_STATUS: ListingStatus = LISTING_STATUSES[1];

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

// The columns a service listing response may carry.
export const listingSelect = {
    listingId: true,
    companyId: true,
    listingTitle: true,
    listingDesc: true,
    minBudget: true,
    maxBudget: true,
    listingStatus: true,
    listingCategory: { select: { catId: true } },
    service: serviceTechStackSelect,
    // Only the name: the company row also holds the sign-in email and
    // password hash (ADR 0001).
    company: { select: { companyName: true } },
} as const;

type SelectedListing = {
    listingId: number;
    companyId: number | null;
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number | null;
    listingStatus: string;
    listingCategory: { catId: number }[];
    service: ServiceTechStackRow;
    company: { companyName: string } | null;
};

export function toListing(row: SelectedListing): ServiceListing {
    return {
        listingId: row.listingId,
        companyId: row.companyId,
        companyName: row.company?.companyName ?? null,
        type: 'SERVICE',
        listingTitle: row.listingTitle,
        listingDesc: row.listingDesc,
        minBudget: row.minBudget,
        maxBudget: row.maxBudget,
        listingStatus: row.listingStatus,
        categoryIds: row.listingCategory.map((c) => c.catId),
        techStack: toTechStackNames(row.service),
    };
}

// Checked before any write, same split as assertPortfolioOwned (lib/
// portfolio.ts): 404 for an id that doesn't exist or isn't a SERVICE
// listing, 403 for one that exists but belongs to another company. A JOB
// listing with this id is treated as not-found here — it isn't this
// endpoint's resource, and 403 would wrongly confirm it exists.
export async function assertListingOwned(
    listingId: number,
    companyId: number,
): Promise<void> {
    const listing = await prisma.listing.findUnique({
        where: { listingId },
        select: { companyId: true, listingType: true },
    });

    if (!listing || listing.listingType !== 'SERVICE') {
        throw ApiError.notFound('Service listing not found');
    }

    // companyId is nullable on an orphaned listing, which never equals a
    // real companyId, so that case lands on 403 without a branch of its own.
    if (listing.companyId !== companyId) {
        throw ApiError.forbidden('This listing belongs to another company');
    }
}

// US3-1. What one service search card needs. Only these company fields, never
// the whole row: it holds the sign-in email and password hash (ADR 0001).
export const serviceSummarySelect = {
    listingId: true,
    listingTitle: true,
    minBudget: true,
    maxBudget: true,
    listingCategory: {
        select: { category: { select: { catName: true } } },
    },
    service: serviceTechStackSelect,
    company: {
        select: {
            companyId: true,
            companyName: true,
            companyPhoto: true,
        },
    },
} as const;

interface ServiceSummaryRow {
    listingId: number;
    listingTitle: string;
    minBudget: number | null;
    maxBudget: number | null;
    listingCategory: { category: { catName: string } }[];
    service: ServiceTechStackRow;
    company: {
        companyId: number;
        companyName: string;
        companyPhoto: string | null;
    } | null;
}

export function toServiceSummary(row: ServiceSummaryRow): ServiceSummary {
    // The search only returns listings that have a company; company_id is
    // still nullable in the schema (conventions §11).
    const company = row.company!;

    return {
        listingId: row.listingId,
        listingTitle: row.listingTitle,
        minBudget: row.minBudget,
        maxBudget: row.maxBudget,
        // Sorted: Prisma returns related rows in no fixed order.
        categories: row.listingCategory
            .map(({ category }) => category.catName)
            .sort(),
        techStack: toTechStackNames(row.service),
        company: {
            companyId: company.companyId,
            companyName: company.companyName,
            companyPhoto: company.companyPhoto,
        },
    };
}
