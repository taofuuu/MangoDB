// Everything the web asks /jobs for: creating and editing one (US2-6,
// US2-14) and the search screen's list and filter options (US3-4 / US3-5).
// Backend: apps/api/src/controllers/job.controller.ts.

import type {
    CreateJobRequest,
    Job,
    JobSortOrder,
    ListingStatus,
    Paginated,
    UpdateJobRequest,
} from '@mangodb/shared';
import { apiFetch } from './api';
import { cachedGet, invalidateAfter } from './apiCache';
import { listCategories } from './categories';

// POST /jobs.
export function createJob(body: CreateJobRequest): Promise<Job> {
    return invalidateAfter(
        apiFetch<Job>('/jobs', {
            method: 'POST',
            body: JSON.stringify(body),
        }),
        '/jobs',
    );
}

// GET /jobs/:jobId.
export function getJob(jobId: number): Promise<Job> {
    const path = `/jobs/${jobId}`;
    return cachedGet(path, () => apiFetch<Job>(path));
}

// GET /jobs/mine: the caller's own jobs, every status.
export interface ListMyJobsOptions {
    status?: ListingStatus | undefined;
}

export function listMyJobs(
    page: number = 1,
    pageSize: number = 10,
    options?: ListMyJobsOptions,
): Promise<Paginated<Job>> {
    const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });

    if (options?.status) {
        query.set('status', options.status);
    }

    const path = `/jobs/mine?${query.toString()}`;
    return cachedGet(path, () => apiFetch<Paginated<Job>>(path));
}

// PATCH /jobs/:jobId.
export function updateJob(jobId: number, body: UpdateJobRequest): Promise<Job> {
    return invalidateAfter(
        apiFetch<Job>(`/jobs/${jobId}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        }),
        '/jobs',
    );
}

// US2-14. Closes an open job and rejects its pending proposals.
// The API answers 409 when the job is not open any more.
export function closeJob(jobId: number): Promise<Job> {
    return invalidateAfter(
        apiFetch<Job>(`/jobs/${jobId}/close`, {
            method: 'POST',
        }),
        '/jobs',
    );
}

// ---------------------------------------------------------------------------
// What the sidebar edits (US3-4 / US3-5).
// Same structure and conventions as SearchServicesFilters in lib/services.ts.
// ---------------------------------------------------------------------------

export type DeadlineType = 'ANY' | 'BEFORE' | 'AFTER';

export type SearchJobsFilters = {
    categories: string[];
    minBudget: number | null;
    maxBudget: number | null;
    deadlineType: DeadlineType;
    deadlineDate: string;
};

export const EMPTY_SEARCH_JOBS_FILTERS: SearchJobsFilters = {
    categories: [],
    minBudget: null,
    maxBudget: null,
    deadlineType: 'ANY',
    deadlineDate: '',
};

export type SearchJobsParams = {
    q?: string | undefined;
    orderBy: JobSortOrder;
    page: number;
    pageSize: number;
    filters: SearchJobsFilters;
};

export type JobFilterOptions = {
    categories: string[];
};

export async function getJobFilterOptions(): Promise<JobFilterOptions> {
    const categories = await listCategories();
    return {
        categories: categories.map((c) => c.categoryName).sort(),
    };
}

// ---------------------------------------------------------------------------
// The list and search calls.
// ---------------------------------------------------------------------------

export interface ListJobsOptions {
    companyId?: number | undefined;
    status?: ListingStatus | undefined;
    q?: string | undefined;
    category?: string[] | undefined;
    minBudget?: number | undefined;
    maxBudget?: number | undefined;
    deadline?: string | undefined;
    deadlineType?: DeadlineType | undefined;
}

// GET /jobs: one company's open jobs or general listing.
export function listJobs(
    page: number,
    pageSize: number,
    options?: ListJobsOptions,
): Promise<Paginated<Job>> {
    // If minBudget exceeds maxBudget, no jobs can match
    if (
        options?.minBudget !== undefined &&
        options?.maxBudget !== undefined &&
        options.minBudget > options.maxBudget
    ) {
        return Promise.resolve({
            items: [],
            pagination: { page, pageSize, totalItems: 0, totalPages: 0 },
        });
    }

    const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });

    if (options?.companyId !== undefined) {
        query.set('companyId', String(options.companyId));
    }

    if (options?.status) {
        query.set('status', options.status);
    }

    if (options?.q) {
        query.set('q', options.q.trim().slice(0, 100));
    }

    options?.category?.forEach((name) => query.append('category', name));

    if (options?.minBudget !== undefined) {
        query.set('minBudget', String(options.minBudget));
    }

    if (options?.maxBudget !== undefined) {
        query.set('maxBudget', String(options.maxBudget));
    }

    if (options?.deadline) {
        query.set('deadline', options.deadline);
        if (options.deadlineType && options.deadlineType !== 'ANY') {
            query.set('deadlineType', options.deadlineType);
        }
    }

    const path = `/jobs?${query.toString()}`;
    return cachedGet(path, () => apiFetch<Paginated<Job>>(path));
}
