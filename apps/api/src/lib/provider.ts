import type { AccountType, ProviderSummary } from '@mangodb/shared';

// What one search result card needs. Kept apart from the query itself: when
// sorting by price arrives, only the step that picks the page of ids changes.
export const providerSummarySelect = {
    companyId: true,
    companyName: true,
    companyDescription: true,
    companyPhoto: true,
    accountType: true,
    provider: {
        select: {
            providerTechStack: { select: { techStackName: true } },
        },
    },
    // Only listings with a service row; a job posting's categories say what
    // the company wants to hire, not what it offers.
    listing: {
        where: { service: { isNot: null } },
        select: {
            listingCategory: {
                select: { category: { select: { catName: true } } },
            },
        },
    },
} as const;

interface ProviderSummaryRow {
    companyId: number;
    companyName: string;
    companyDescription: string | null;
    companyPhoto: string | null;
    accountType: string;
    provider: { providerTechStack: { techStackName: string }[] } | null;
    listing: { listingCategory: { category: { catName: string } }[] }[];
}

export function toProviderSummary(row: ProviderSummaryRow): ProviderSummary {
    // Two services in the same category should show the category once.
    const categories = new Set(
        row.listing.flatMap((listing) =>
            listing.listingCategory.map(({ category }) => category.catName),
        ),
    );

    return {
        companyId: row.companyId,
        companyName: row.companyName,
        companyDescription: row.companyDescription,
        companyPhoto: row.companyPhoto,
        accountType: row.accountType as AccountType,
        // Sorted: Prisma returns related rows in no fixed order.
        categories: [...categories].sort(),
        techStack: (
            row.provider?.providerTechStack.map((t) => t.techStackName) ?? []
        ).sort(),
    };
}
