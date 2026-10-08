import type { AccountType, CompanySummary } from '@mangodb/shared';
import {
    type ServiceTechStackRow,
    serviceTechStackSelect,
    toTechStackNames,
} from './service';
import { companyRatingSelect, getCompanyRating } from './companyRating';

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
    address: true,
    website: true,
    companyType: { select: { companyType: true } },
    provider: { select: { serviceTerm: true, warrantyPolicy: true } },
    ...companyRatingSelect,
    // Services only; a job posting's categories say what the company wants
    // to hire, not what it offers. A Receiver has none, so both lists are
    // empty on its card.
    listing: {
        where: { listingType: 'SERVICE' },
        select: {
            listingCategory: {
                select: { category: { select: { catName: true } } },
            },
            service: serviceTechStackSelect,
        },
    },
} as const;

interface CompanySummaryRow {
    companyId: number;
    companyName: string;
    companyDescription: string | null;
    companyPhoto: string | null;
    accountType: string;
    contactEmail: string | null;
    phone: string;
    address: string | null;
    website: string | null;
    companyType: { companyType: string }[];
    provider: {
        serviceTerm: string | null;
        warrantyPolicy: string | null;
    } | null;
    proposal: {
        project: {
            rating: { ratingScore: unknown }[];
        } | null;
    }[];
    listing: {
        listingCategory: { category: { catName: string } }[];
        service: ServiceTechStackRow;
    }[];
}

export function toCompanySummary(row: CompanySummaryRow): CompanySummary {
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
        contactEmail: row.contactEmail,
        phone: row.phone,
        address: row.address,
        website: row.website,
        companyType: row.companyType.map(({ companyType }) => companyType),
        serviceTerm: row.provider?.serviceTerm ?? null,
        warrantyPolicy: row.provider?.warrantyPolicy ?? null,
        ...getCompanyRating(row),
        // Sorted: Prisma returns related rows in no fixed order.
        categories: [...categories].sort(),
        techStack: [...techStack].sort(),
    };
}
