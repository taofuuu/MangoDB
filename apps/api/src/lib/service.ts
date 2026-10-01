// listing_status is a plain VarChar(50) column with no DB enum, so this is the
// single source of truth for its values. Browse filters and proposal logic
// should import from here instead of hardcoding strings.
import type { ListingStatus, ServiceSummary } from '@mangodb/shared';
import { LISTING_STATUSES } from '@mangodb/shared';

export const DEFAULT_LISTING_STATUS: ListingStatus = LISTING_STATUSES[1];

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
};

// TODO: move to @mangodb/shared next to ServicePortfolio so the frontend can
// import it. Kept here until you decide where the wire types live.
export type Listing = {
    listingId: number;
    companyId: number | null;
    type: 'SERVICE';
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number | null;
    listingStatus: string;
    categoryIds: number[];
};

export function toListing(row: SelectedListing): Listing {
    return {
        listingId: row.listingId,
        companyId: row.companyId,
        type: 'SERVICE',
        listingTitle: row.listingTitle,
        listingDesc: row.listingDesc,
        minBudget: row.minBudget,
        maxBudget: row.maxBudget,
        listingStatus: row.listingStatus,
        categoryIds: row.listingCategory.map((c) => c.catId),
    };
}

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
