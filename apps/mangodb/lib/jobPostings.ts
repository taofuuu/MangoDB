import type {
    CreateJobRequest,
    Job,
    ListingStatus,
    Paginated,
    UpdateJobRequest,
} from '@mangodb/shared';

import { apiFetch } from './api';
import { cachedGet, invalidateAfter } from './apiCache';

export interface GetJobPostingsOptions {
    companyId?: number;
    status?: ListingStatus;
    q?: string;
}

// GET all job postings
export function listJobPostings(
    page: number,
    pageSize: number,
    options?: GetJobPostingsOptions,
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

    const path = `/jobs?${query.toString()}`;
    return cachedGet(path, () => apiFetch<Paginated<Job>>(path));
}

// GET own job postings
export interface GetMyJobPostingsOptions {
    status?: ListingStatus;
}

export function listMyJobPostings(
    page: number,
    pageSize: number,
    options?: GetMyJobPostingsOptions,
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

// GET one job posting
export function getJobPosting(jobId: number): Promise<Job> {
    const path = `/jobs/${jobId}`;
    return cachedGet(path, () => apiFetch<Job>(path));
}

//POST job
export function createJobPosting(data: CreateJobRequest): Promise<Job> {
    return invalidateAfter(
        apiFetch<Job>('/jobs', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        '/jobs',
    );
}

// US2-14. Closes an open job posting and rejects its pending proposals.
// The API answers 409 when the posting is not open any more.
export function closeJobPosting(jobId: number): Promise<Job> {
    return invalidateAfter(
        apiFetch<Job>(`/jobs/${jobId}/close`, {
            method: 'POST',
        }),
        '/jobs',
    );
}

//UPDATE job
export function updateJobPosting(
    jobId: number,
    data: UpdateJobRequest,
): Promise<Job> {
    return invalidateAfter(
        apiFetch<Job>(`/jobs/${jobId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
        '/jobs',
    );
}
