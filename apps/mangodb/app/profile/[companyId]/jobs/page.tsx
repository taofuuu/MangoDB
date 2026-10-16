'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import JobPostingsPage from '@/components/job/JobPostingsPage';
import { parseCompanyId } from '@/lib/companies';

// /profile/[companyId]/jobs: every OPEN job posting of one company, opened
// from See more on its profile. The company comes from the path, so there is
// no search box; JobPostingsPage's company view does the list and paging.
export default function CompanyJobsPage() {
    const companyId = parseCompanyId(useParams().companyId);

    if (companyId === null) {
        return (
            <div className="min-h-screen bg-surface p-6">
                <p className="type-sm">
                    This company could not be found.{' '}
                    <Link href="/companies" className="underline">
                        Search companies
                    </Link>
                </p>
            </div>
        );
    }

    // JobPostingsPage reads useSearchParams, which needs a Suspense boundary.
    return (
        <Suspense fallback={<div className="min-h-screen bg-surface" />}>
            <JobPostingsPage view="company" companyId={companyId} />
        </Suspense>
    );
}
