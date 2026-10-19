'use client';

import { useEffect, useState } from 'react';
import type { Job } from '@mangodb/shared';
import { describeError, isNotSignedIn } from '@/lib/api';
import { listJobs, listMyJobs } from '@/lib/jobs';
import { PROFILE_LIST_SIZE } from '@/lib/pagination';
import { redirectToUnauthorized } from '@/lib/session';

type CompanyJobsOptions = {
    companyId: number;
    // Another company's profile: only its OPEN jobs, from GET
    // /jobs?companyId=. Your own shows every status, from GET /jobs/mine, so
    // closed ones stay in view (US2-2).
    readOnly: boolean;
    // False skips the request, for a profile with no jobs to show.
    enabled?: boolean;
};

// The first page of a company's jobs, for the job list on its profile.
// jobs is null until the list answers, so "Loading…" shows instead of a
// momentary "No job listings yet."
export function useCompanyJobs({
    companyId,
    readOnly,
    enabled = true,
}: CompanyJobsOptions) {
    const [jobs, setJobs] = useState<Job[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        const request = readOnly
            ? listJobs(1, PROFILE_LIST_SIZE, { companyId, status: 'OPEN' })
            : listMyJobs(1, PROFILE_LIST_SIZE);

        request
            .then((data) => {
                if (!cancelled) setJobs(data.items);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                if (isNotSignedIn(err)) {
                    redirectToUnauthorized();
                    return;
                }
                setError(describeError(err));
            });

        return () => {
            cancelled = true;
        };
    }, [companyId, readOnly, enabled]);

    return { jobs: enabled ? jobs : [], error };
}
