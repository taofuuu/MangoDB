'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import JobForm from '@/components/forms/JobForm';
import UnauthorizedPage from '@/components/service/UnauthorizedPage';
import { getMyProfile } from '@/lib/companies';
import { getJobPostingDetail } from '@/lib/job';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';

import type { JobPosting } from '@mangodb/shared';

type EditJobPageProps = {
    params: Promise<{
        jobPostingId: string;
    }>;
};

export default function EditJobPage({ params }: EditJobPageProps) {
    const { jobPostingId: rawId } = use(params);
    const router = useRouter();
    const jobPostingId = Number(rawId);
    const isValidJobPostingId =
        Number.isSafeInteger(jobPostingId) && jobPostingId > 0;

    const [job, setJob] = useState<JobPosting | null>(null);
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!isValidJobPostingId) {
            return;
        }

        let cancelled = false;

        async function checkPermissions() {
            try {
                const profile = await getMyProfile();

                if (cancelled) return;

                const hasReceiverRole =
                    profile.accountType === 'RECEIVER' ||
                    profile.accountType === 'BOTH';

                if (!hasReceiverRole) {
                    router.replace('/job/view-own');
                    setIsAuthorized(false);
                    return;
                }

                const posting = await getJobPostingDetail(jobPostingId);

                // Confirm the posting can be retrieved.
                const job = await getJobPostingDetail(jobPostingId);

                if (cancelled) return;

                // Only the company that owns the posting can edit it.
                if (posting.companyId !== profile.companyId) {
                    setLoadError(
                        'You are not authorized to edit this job posting.',
                    );
                    setIsAuthorized(false);
                    return;
                }

                if (job.listingStatus !== 'OPEN') {
                    setLoadError('Only open job postings can be edited.');
                    setIsAuthorized(false);
                    return;
                }

                setJob(posting);
                setIsAuthorized(true);
            } catch (err: unknown) {
                if (cancelled) return;

                setLoadError(
                    isNotSignedIn(err) ? NOT_SIGNED_IN : describeError(err),
                );
                setIsAuthorized(false);
            }
        }

        void checkPermissions();

        return () => {
            cancelled = true;
        };
    }, [jobPostingId, router, isValidJobPostingId]);

    if (!isValidJobPostingId) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-surface px-6">
                <p className="type-sm text-danger text-center">
                    Invalid job posting ID.
                </p>
            </div>
        );
    }

    if (isAuthorized === null) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-surface">
                <p className="type-sm text-ink-placeholder">
                    Checking permissions...
                </p>
            </div>
        );
    }

    if (!isAuthorized) {
        if (loadError === NOT_SIGNED_IN) {
            return <UnauthorizedPage />;
        }

        if (loadError) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-surface px-6">
                    <p className="type-sm text-danger text-center">
                        {loadError}
                    </p>
                </div>
            );
        }

        return null;
    }

    return (
        <main className="min-h-screen bg-surface px-[1.67vw] py-[2.96vh] text-ink">
            <div className="ml-[9vw] flex w-full max-w-5xl flex-col gap-[1.94vh]">
                <h1 className="type-hd">Edit Your Job Posting</h1>

                <hr className="w-[80.9375vw] border-brand-dark/50" />

                <p className="type-md !font-[600]">*Indicates required</p>

                <div className="mt-[1px] ml-[7vw] flex w-full justify-center">
                    {job && (
                        <JobForm
                            jobPostingId={job.jobPostingId}
                            initialJob={job}
                        />
                    )}
                </div>
            </div>
        </main>
    );
}
