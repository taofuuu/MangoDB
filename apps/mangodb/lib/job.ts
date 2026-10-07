import type { JobPosting, JobPostingListResponse } from '@mangodb/shared';

import { apiFetch } from './api';
import { cachedGet, clearPageCache } from './pageCache';

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

    // written under time-crunch bypass — review later
    const path = `/job-postings?${query.toString()}`;
    return cachedGet(path, () => apiFetch<JobPostingListResponse>(path));
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

    // written under time-crunch bypass — review later
    const path = `/job-postings/mine?${query.toString()}`;
    return cachedGet(path, () => apiFetch<JobPostingListResponse>(path));
}

// written under time-crunch bypass — review later
// Call after anything that adds, edits or closes a job posting, so the lists
// show it right away instead of after the cache's max age.
export function clearJobPostingCache(): void {
    clearPageCache('/job-postings');
}

// GET one job posting
export function getJobPostingDetail(jobPostingId: number): Promise<JobPosting> {
    return apiFetch<JobPosting>(`/job-postings/${jobPostingId}`);
}
