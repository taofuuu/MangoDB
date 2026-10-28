import type {
    CompanyBrief,
    Job,
    JobSortOrder,
    ListingStatus,
    ListingType,
} from '@mangodb/shared';
import { companyBriefSelect, toCompanyBrief } from './company-profile';
import { containsWord, splitWords } from './search';
import { fromDateOnly, toDateOnly } from './dates';
import { categoryNameWhere, listingBudgetWhere } from './listing';
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

type JobRow = {
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
export function toJob(row: JobRow): Job {
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
        deadline: row.job?.deadline ? toDateOnly(row.job.deadline) : null,
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

// US3-5. Keeps a job whose deadline is on or before (or after) the given day in UTC.
// Jobs without a deadline cannot match a deadline filter.
export function jobDeadlineWhere(
    deadline: string,
    deadlineType: 'BEFORE' | 'AFTER' = 'BEFORE',
): Prisma.ListingWhereInput {
    return {
        job: {
            deadline: {
                [deadlineType === 'AFTER' ? 'gte' : 'lte']:
                    fromDateOnly(deadline),
            },
        },
    };
}

// US2-7 / US3-4 / US3-5. Which jobs a list may return to the caller:
// - Only jobs, and only of companies not soft-deleted (search is discovery).
// - status, companyId, category, minBudget, maxBudget, deadline and each keyword word narrow it.
// - An OPEN job is visible to every company; a closed one only to its owner.
export function jobSearchWhere(
    filters: {
        status?: ListingStatus | undefined;
        companyId?: number | undefined;
        q?: string | undefined;
        category?: string[] | undefined;
        minBudget?: number | undefined;
        maxBudget?: number | undefined;
        deadline?: string | undefined;
        deadlineType?: 'ANY' | 'BEFORE' | 'AFTER' | undefined;
    },
    callerId: number,
): Prisma.ListingWhereInput {
    const {
        status,
        companyId,
        q,
        category,
        minBudget,
        maxBudget,
        deadline,
        deadlineType,
    } = filters;
    const effectiveDeadlineType = deadlineType === 'AFTER' ? 'AFTER' : 'BEFORE';
    return {
        AND: [
            { listingType: 'JOB' satisfies ListingType },
            ...(status ? [{ listingStatus: status }] : []),
            ...(companyId ? [{ companyId }] : []),
            { company: { deletedAt: null } },
            ...splitWords(q).map(jobKeywordWhere),
            ...(category?.length ? [categoryNameWhere(category)] : []),
            ...listingBudgetWhere({ minBudget, maxBudget }),
            ...(deadline && deadlineType !== 'ANY'
                ? [jobDeadlineWhere(deadline, effectiveDeadlineType)]
                : []),
            {
                OR: [
                    { listingStatus: 'OPEN' satisfies ListingStatus },
                    { companyId: callerId },
                ],
            },
        ],
    };
}

// US3-8 (T3.8.2, T3.8.3). Ordering is applied in the database, before pagination.
// Missing budgets or deadlines sort last so concrete criteria always show first.
// listingId breaks ties so pages remain stable.
export function jobOrderBy(
    orderBy: JobSortOrder,
): Prisma.ListingOrderByWithRelationInput[] {
    const primary: Record<
        JobSortOrder,
        Prisma.ListingOrderByWithRelationInput
    > = {
        maxBudgetDesc: { maxBudget: { sort: 'desc', nulls: 'last' } },
        maxBudgetAsc: { maxBudget: { sort: 'asc', nulls: 'last' } },
        deadlineAsc: { job: { deadline: { sort: 'asc', nulls: 'last' } } },
        deadlineDesc: {
            job: { deadline: { sort: 'desc', nulls: 'last' } },
        },
        newest: { createdAt: 'desc' },
    };
    return [primary[orderBy], { listingId: 'desc' }];
}
