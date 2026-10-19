import type { AccountType, CompanySummary, ListingType } from '@mangodb/shared';
import {
    type ServiceTechStackRow,
    serviceTechStackSelect,
    serviceTextMatches,
    toTechStackNames,
} from './service';
import { containsWord } from './search';
import type { Prisma } from '../generated/prisma/client';

// US3-6. One word matches the company, or one of its services by title,
// description, category or tech stack, ignoring case. Jobs are left out: they
// say what the company wants to hire, not what it offers. So a Receiver
// matches on its name or description only.
export function companyKeywordWhere(word: string): Prisma.CompanyWhereInput {
    const contains = containsWord(word);
    return {
        OR: [
            { companyName: contains },
            { companyDescription: contains },
            {
                listing: {
                    some: {
                        listingType: 'SERVICE' satisfies ListingType,
                        OR: serviceTextMatches(word),
                    },
                },
            },
        ],
    };
}

// What one search result card needs. Kept apart from the query itself: when
// sorting by price arrives, only the step that picks the page of ids changes.
export const companySummarySelect = {
    companyId: true,
    companyName: true,
    companyDescription: true,
    companyPhoto: true,
    accountType: true,
    contactEmail: true,
    phone: true,
    website: true,
    // Services only; a job posting's categories say what the company wants
    // to hire, not what it offers. A Receiver has none, so both lists are
    // empty on its card.
    listing: {
        where: { listingType: 'SERVICE' satisfies ListingType },
        select: {
            listingCategory: {
                select: { category: { select: { categoryName: true } } },
            },
            service: serviceTechStackSelect,
        },
    },
} as const satisfies Prisma.CompanySelect;

interface CompanySummaryRow {
    companyId: number;
    companyName: string;
    companyDescription: string | null;
    companyPhoto: string | null;
    accountType: string;
    contactEmail: string | null;
    phone: string;
    website: string | null;
    listing: {
        listingCategory: { category: { categoryName: string } }[];
        service: ServiceTechStackRow;
    }[];
}

export function toCompanySummary(row: CompanySummaryRow): CompanySummary {
    // Two services in the same category, or with the same tech, should show
    // it once.
    const categories = new Set(
        row.listing.flatMap((listing) =>
            listing.listingCategory.map(
                ({ category }) => category.categoryName,
            ),
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
        contactEmail: row.contactEmail,
        phone: row.phone,
        website: row.website,
        // Sorted: Prisma returns related rows in no fixed order.
        categories: [...categories].sort(),
        techStack: [...techStack].sort(),
    };
}
