import type { JobPosting, JobPostingListResponse } from '@mangodb/shared';

import { apiFetch } from './api';

export interface GetJobPostingsOptions {
    companyId?: number;
    status?: 'OPEN' | 'CLOSED';
    q?: string;
}

// GET all job postings
export function getAllJobPostings(
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

    return apiFetch<JobPostingListResponse>(
        `/job-postings?${query.toString()}`,
    );
}

// GET own job postings
export interface GetMyJobPostingsOptions {
    status?: 'OPEN' | 'CLOSED';
}

export function getMyJobPostings(
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

    return apiFetch<JobPostingListResponse>(
        `/job-postings/mine?${query.toString()}`,
    );
}

// GET one job posting
export function getJobPostingDetail(jobPostingId: number): Promise<JobPosting> {
    return apiFetch<JobPosting>(`/job-postings/${jobPostingId}`);
}
