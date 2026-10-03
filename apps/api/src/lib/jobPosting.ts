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
    company: {
        companyName: string;
    } | null;
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number | null;
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
        companyName: row.company?.companyName ?? '',
        listingTitle: row.listingTitle,
        listingDesc: row.listingDesc,
        minBudget: row.minBudget,
        maxBudget: row.maxBudget,
        listingStatus: row.listingStatus as ListingStatus,
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

// Create and edit both take categoryIds, so both check them here: an unknown
// id is a 400 on the field rather than a foreign key error from the database.
export async function assertCategoriesExist(
    categoryIds: number[],
): Promise<void> {
    const uniqueCatIds = [...new Set(categoryIds)];
    if (uniqueCatIds.length === 0) return;

    const existingCats = await prisma.category.findMany({
        where: { catId: { in: uniqueCatIds } },
        select: { catId: true },
    });

    if (existingCats.length !== uniqueCatIds.length) {
        throw ApiError.validationFailed([
            {
                field: 'categoryIds',
                message: 'One or more selected categories do not exist',
            },
        ]);
    }
}

// Ownership verification helper: 404 and 403 stay separate because job postings
// are discoverable in public listings, so hiding existence buys nothing.
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
