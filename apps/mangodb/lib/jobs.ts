import type {
    CreateJobRequest,
    Job,
    ListingStatus,
    Paginated,
    UpdateJobRequest,
} from '@mangodb/shared';

import { apiFetch } from './api';
import { cachedGet, invalidateAfter } from './apiCache';

export interface ListJobsOptions {
    companyId?: number;
    status?: ListingStatus;
    q?: string;
    category?: string[];
    minBudget?: number;
    maxBudget?: number;
    deadline?: string;
}

// GET /jobs: the jobs the caller may see, one page at a time.
export function listJobs(
    page: number,
    pageSize: number,
    options?: ListJobsOptions,
): Promise<Paginated<Job>> {
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
        query.set('q', options.q);
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
    }

    const path = `/jobs?${query.toString()}`;
    return cachedGet(path, () => apiFetch<Paginated<Job>>(path));
}

// GET /jobs/mine: the caller's own jobs, every status.
export interface ListMyJobsOptions {
    status?: ListingStatus;
}

export function listMyJobs(
    page: number,
    pageSize: number,
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

// GET /jobs/:jobId.
export function getJob(jobId: number): Promise<Job> {
    const path = `/jobs/${jobId}`;
    return cachedGet(path, () => apiFetch<Job>(path));
}

// POST /jobs.
export function createJob(data: CreateJobRequest): Promise<Job> {
    return invalidateAfter(
        apiFetch<Job>('/jobs', {
            method: 'POST',
            body: JSON.stringify(data),
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

// PATCH /jobs/:jobId.
export function updateJob(jobId: number, data: UpdateJobRequest): Promise<Job> {
    return invalidateAfter(
        apiFetch<Job>(`/jobs/${jobId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
        '/jobs',
    );
}
