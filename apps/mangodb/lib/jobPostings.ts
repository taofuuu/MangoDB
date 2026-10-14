import type {
    JobPosting,
    JobPostingListResponse,
    CreateJobPostingRequest,
    UpdateJobPostingRequest,
} from '@mangodb/shared';

import { apiFetch } from './api';
import { cachedGet, invalidateAfter } from './apiCache';

export interface GetJobPostingsOptions {
    companyId?: number;
    status?: 'OPEN' | 'CLOSED';
    q?: string;
}

// GET all job postings
export function listJobPostings(
    page: number,
    pageSize: number,
    options?: GetJobPostingsOptions,
): Promise<JobPostingListResponse> {
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

    const path = `/job-postings?${query.toString()}`;
    return cachedGet(path, () => apiFetch<JobPostingListResponse>(path));
}

// GET own job postings
export interface GetMyJobPostingsOptions {
    status?: 'OPEN' | 'CLOSED';
}

export function listMyJobPostings(
    page: number,
    pageSize: number,
    options?: GetMyJobPostingsOptions,
): Promise<JobPostingListResponse> {
    const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });

    if (options?.status) {
        query.set('status', options.status);
    }

    const path = `/job-postings/mine?${query.toString()}`;
    return cachedGet(path, () => apiFetch<JobPostingListResponse>(path));
}

// GET one job posting
export function getJobPosting(jobPostingId: number): Promise<JobPosting> {
    const path = `/job-postings/${jobPostingId}`;
    return cachedGet(path, () => apiFetch<JobPosting>(path));
}

//POST job
export type CreateJobPosting = CreateJobPostingRequest;

export function createJobPosting(data: CreateJobPosting): Promise<JobPosting> {
    return invalidateAfter(
        apiFetch<JobPosting>('/job-postings', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        '/job-postings',
    );
}

//UPDATE job
export type UpdateJobPosting = UpdateJobPostingRequest;

export function updateJobPosting(
    jobPostingId: number,
    data: UpdateJobPosting,
): Promise<JobPosting> {
    return apiFetch<JobPosting>(`/job-postings/${jobPostingId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}
