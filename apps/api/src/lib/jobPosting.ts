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
    company: {
        select: {
            companyName: true,
        },
    },
    job: {
        select: {
            locationPref: true,
            duration: true,
            deadline: true,
        },
    },
    listingCategory: {
        select: {
            categoryId: true,
            category: { select: { categoryName: true } },
        },
    },
} as const;

export type SelectedJobPosting = {
    listingId: number;
    companyId: number | null;
    company: {
        companyName: string;
    } | null;
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number | null;
    listingStatus: string;
    createdAt: Date;
    job: {
        locationPref: string | null;
        duration: string | null;
        deadline: Date | null;
    } | null;
    listingCategory: {
        categoryId: number;
        category: { categoryName: string };
    }[];
};

// DTO function that shapes the Prisma row into the shared wire JobPosting format.
// Converts @db.Date to YYYY-MM-DD string per docs/conventions.md section 10.
export function toJobPosting(row: SelectedJobPosting): JobPosting {
    return {
        jobPostingId: row.listingId,
        companyId: row.companyId!,
        companyName: row.company?.companyName ?? '',
        listingTitle: row.listingTitle,
        listingDesc: row.listingDesc,
        minBudget: row.minBudget,
        maxBudget: row.maxBudget,
        listingStatus: row.listingStatus as ListingStatus,
        locationPref: row.job?.locationPref ?? null,
        duration: row.job?.duration ?? null,
        deadline: row.job?.deadline
            ? row.job.deadline.toISOString().slice(0, 10)
            : null,
        categoryIds: row.listingCategory.map((lc) => lc.categoryId),
        categories: row.listingCategory.map((lc) => lc.category.categoryName),
        createdAt: row.createdAt.toISOString(),
    };
}

// Ownership verification helper for edit and close: 404 and 403 stay separate
// because an open job posting is discoverable in public listings, so hiding it
// buys nothing. GET /job-postings/:id is stricter: a non-open posting is 404 to
// anyone but its owner (job-posting.controller.ts, getJobPosting).
// Returns the row it read, so edit can check the status and budgets without a
// second query.
export async function assertJobPostingOwned(
    jobPostingId: number,
    companyId: number,
): Promise<{
    listingStatus: string;
    minBudget: number | null;
    maxBudget: number | null;
}> {
    const posting = await prisma.listing.findUnique({
        where: { listingId: jobPostingId },
        select: {
            companyId: true,
            listingType: true,
            listingStatus: true,
            minBudget: true,
            maxBudget: true,
        },
    });

    if (!posting || posting.listingType !== 'JOB') {
        throw ApiError.notFound('Job posting not found');
    }
    if (posting.companyId !== companyId) {
        throw ApiError.forbidden(
            'Insufficient permissions to access this resource',
        );
    }

    return posting;
}
