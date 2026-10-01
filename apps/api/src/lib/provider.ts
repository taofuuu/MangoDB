import type { AccountType, ProviderSummary } from '@mangodb/shared';
import {
    type ServiceTechStackRow,
    serviceTechStackSelect,
    toTechStackNames,
} from './service';

// What one search result card needs. Kept apart from the query itself: when
// sorting by price arrives, only the step that picks the page of ids changes.
export const providerSummarySelect = {
    companyId: true,
    companyName: true,
    companyDescription: true,
    companyPhoto: true,
    accountType: true,
    // Only listings with a service row; a job posting's categories say what
    // the company wants to hire, not what it offers.
    listing: {
        where: { service: { isNot: null } },
        select: {
            listingCategory: {
                select: { category: { select: { catName: true } } },
            },
            service: serviceTechStackSelect,
        },
    },
} as const;

interface ProviderSummaryRow {
    companyId: number;
    companyName: string;
    companyDescription: string | null;
    companyPhoto: string | null;
    accountType: string;
    listing: {
        listingCategory: { category: { catName: string } }[];
        service: ServiceTechStackRow;
    }[];
}

export function toProviderSummary(row: ProviderSummaryRow): ProviderSummary {
    // Two services in the same category, or with the same tech, should show
    // it once.
    const categories = new Set(
        row.listing.flatMap((listing) =>
            listing.listingCategory.map(({ category }) => category.catName),
        ),
    );
    const techStack = new Set(
        row.listing.flatMap((listing) => toTechStackNames(listing.service)),
    );

    return {
        companyId: row.companyId,
        companyName: row.companyName,
        companyDescription: row.companyDescription,
        companyPhoto: row.companyPhoto,
        accountType: row.accountType as AccountType,
        // Sorted: Prisma returns related rows in no fixed order.
        categories: [...categories].sort(),
        techStack: [...techStack].sort(),
    };
}
