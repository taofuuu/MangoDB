'use client';

import { useEffect, useState } from 'react';
import type { Job, ListingStatus, Paginated } from '@mangodb/shared';
import {
    NOT_SIGNED_IN,
    describeError,
    isForbidden,
    isNotSignedIn,
} from './api';
import { listJobs, listMyJobs, type ListJobsOptions } from './jobs';
import { JOB_PAGE_SIZE } from './pagination';
import { redirectToUnauthorized } from './session';

// Which jobs the list shows:
// 'search'  — /jobs: every company's open jobs, narrowed by a keyword
// 'mine'    — My Jobs: the signed-in company's jobs, any status
// 'company' — one company's open jobs, from its profile
export type JobListOptions =
    | { view: 'search' }
    | { view: 'mine' }
    | { view: 'company'; companyId: number };

// '' is the All tab: no status filter. Only My Jobs filters by status.
export type JobStatusFilter = '' | ListingStatus;

// One page of jobs for a list screen, and the controls that change it, the
// way useSearchServices serves the service search.
export function useJobList(options: JobListOptions) {
    const { view } = options;
    const companyId = options.view === 'company' ? options.companyId : null;

    const [page, setPage] = useState(1);
    const [q, setQ] = useState('');
    const [status, setStatus] = useState<JobStatusFilter>('');
    const [result, setResult] = useState<Paginated<Job> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // A sentence to show, or NOT_SIGNED_IN while the page leaves for login.
    const [error, setError] = useState<string | null>(null);
    // A 403: this account type cannot use the list (My Jobs for a Provider).
    const [isRestricted, setIsRestricted] = useState(false);
    // Bumped to load the same page again.
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setError(null);

        let request: Promise<Paginated<Job>>;
        if (view === 'mine') {
            request = listMyJobs(
                page,
                JOB_PAGE_SIZE,
                status ? { status } : undefined,
            );
        } else {
            const filters: ListJobsOptions = { status: 'OPEN', q };
            if (companyId !== null) filters.companyId = companyId;
            request = listJobs(page, JOB_PAGE_SIZE, filters);
        }

        request
            .then((data) => {
                if (!cancelled) setResult(data);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                if (isNotSignedIn(err)) {
                    setError(NOT_SIGNED_IN);
                    redirectToUnauthorized();
                    return;
                }
                if (isForbidden(err)) {
                    setIsRestricted(true);
                    return;
                }
                setError(describeError(err));
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [view, companyId, page, q, status, reloadKey]);

    // A new keyword or status starts again from page 1.
    function search(keyword: string) {
        setQ(keyword);
        setPage(1);
    }

    function changeStatus(next: JobStatusFilter) {
        setStatus(next);
        setPage(1);
    }

    function reload() {
        setReloadKey((key) => key + 1);
    }

    return {
        jobs: result?.items ?? [],
        pagination: result?.pagination ?? null,
        // False until the first page arrives, so the page can stay blank.
        hasLoaded: result !== null,
        page,
        q,
        status,
        isLoading,
        error,
        isRestricted,
        search,
        changeStatus,
        goToPage: setPage,
        reload,
    };
}
