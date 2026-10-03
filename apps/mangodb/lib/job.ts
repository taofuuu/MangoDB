import type { JobPosting, JobPostingListResponse } from '@mangodb/shared';

import { apiFetch } from './api';

export function getJobPostings(
    page: number,
    pageSize: number,
): Promise<JobPostingListResponse> {
    const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });

    return apiFetch<JobPostingListResponse>(
        `/job-postings?${query.toString()}`,
    );
}

//GET own job Posting
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
// export function getJobPostings(): Promise<JobPostingListResponse> {
//     return apiFetch<JobPostingListResponse>('/job-postings');
// }
// export function getJobPostings(): Promise<JobPosting[]> {
//     return apiFetch<JobPosting[]>('/job-postings');
// }

export function getJobPostingDetail(jobPostingId: number): Promise<JobPosting> {
    return apiFetch<JobPosting>(`/job-postings/${jobPostingId}`);
}
