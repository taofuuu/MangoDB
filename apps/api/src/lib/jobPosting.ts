import type { JobPosting, ListingStatus } from '@mangodb/shared';
import { prisma } from './prisma';
import { ApiError } from './ApiError';

// The columns a job posting query selects. Naming them explicitly keeps the
// wire response deliberate rather than exposing whatever the table happens to have.
export const jobPostingSelect = {
    listingId: true,
    companyId: true,
    listingTitle: true,
    listingDesc: true,
    minBudget: true,
    maxBudget: true,
    listingStatus: true,
    createdAt: true,
    jobRequirement: {
        select: {
            locationPref: true,
            duration: true,
            deadline: true,
        },
    },
    listingCategory: {
        select: {
            catId: true,
            category: { select: { catName: true } },
        },
    },
} as const;

export type SelectedJobPosting = {
    listingId: number;
    companyId: number | null;
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number;
    listingStatus: string;
    createdAt: Date;
    jobRequirement: {
        locationPref: string | null;
        duration: string | null;
        deadline: Date | null;
    } | null;
    listingCategory: {
        catId: number;
        category: { catName: string };
    }[];
};

// DTO function that shapes the Prisma row into the shared wire JobPosting format.
// Converts @db.Date to YYYY-MM-DD string per docs/conventions.md section 10.
export function toJobPosting(row: SelectedJobPosting): JobPosting {
    return {
        jobPostingId: row.listingId,
        companyId: row.companyId!,
        listingTitle: row.listingTitle,
        listingDesc: row.listingDesc,
        minBudget: row.minBudget,
        maxBudget: row.maxBudget,
        // TODO: remove after listing_status data fix
        listingStatus: row.listingStatus.toUpperCase() as ListingStatus,
        locationPref: row.jobRequirement?.locationPref ?? null,
        duration: row.jobRequirement?.duration ?? null,
        deadline: row.jobRequirement?.deadline
            ? row.jobRequirement.deadline.toISOString().slice(0, 10)
            : null,
        categoryIds: row.listingCategory.map((lc) => lc.catId),
        categories: row.listingCategory.map((lc) => lc.category.catName),
        createdAt: row.createdAt.toISOString(),
    };
}

// Ownership verification helper: 404 and 403 stay separate because job postings
// are discoverable in public listings, so hiding existence buys nothing.
export async function assertJobPostingOwned(
    jobPostingId: number,
    companyId: number,
): Promise<void> {
    const posting = await prisma.listing.findUnique({
        where: { listingId: jobPostingId },
        select: { companyId: true, listingType: true },
    });

    if (!posting || posting.listingType !== 'JOB') {
        throw ApiError.notFound('Job posting not found');
    }
    if (posting.companyId !== companyId) {
        throw ApiError.forbidden(
            'Insufficient permissions to access this resource',
        );
    }
}
