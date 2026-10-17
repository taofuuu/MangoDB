import type { CompanyBrief, Job, ListingStatus } from '@mangodb/shared';
import { companyBriefSelect, toCompanyBrief } from './company-profile';
import { containsWord } from './search';
import type { Prisma } from '../generated/prisma/client';

// The columns a job posting query selects. Naming them explicitly keeps the
// wire response deliberate rather than exposing whatever the table happens to have.
export const jobSelect = {
    listingId: true,
    companyId: true,
    listingTitle: true,
    listingDesc: true,
    minBudget: true,
    maxBudget: true,
    listingStatus: true,
    createdAt: true,
    company: { select: companyBriefSelect },
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
} as const satisfies Prisma.ListingSelect;

export type SelectedJob = {
    listingId: number;
    companyId: number | null;
    company: CompanyBrief | null;
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

// DTO function that shapes the Prisma row into the shared wire Job format.
// Converts @db.Date to YYYY-MM-DD string per docs/conventions.md section 10.
export function toJob(row: SelectedJob): Job {
    return {
        jobId: row.listingId,
        company: toCompanyBrief(row.company),
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

// US3-4. One word matches the job's title or description, ignoring case.
export function jobKeywordWhere(word: string): Prisma.ListingWhereInput {
    const contains = containsWord(word);
    return { OR: [{ listingTitle: contains }, { listingDesc: contains }] };
}
