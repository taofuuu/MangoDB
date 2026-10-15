'use client';

import { use, useEffect, useState } from 'react';

import JobForm from '@/components/forms/JobForm';
import UnauthorizedPage from '@/components/auth/UnauthorizedPage';
import { getMyProfile } from '@/lib/companies';
import { getJobPosting } from '@/lib/jobPostings';
import { describeError, isNotSignedIn } from '@/lib/api';

import { isReceiverAccount } from '@/lib/roles';
import { redirectToUnauthorized } from '@/lib/session';
import Link from 'next/link';

import type { JobPosting } from '@mangodb/shared';

type EditJobPageProps = {
    params: Promise<{
        jobPostingId: string;
    }>;
};

export default function EditJobPage({ params }: EditJobPageProps) {
    const { jobPostingId: rawId } = use(params);
    const jobPostingId = Number(rawId);
    const isValidJobPostingId =
        Number.isSafeInteger(jobPostingId) && jobPostingId > 0;

    const [job, setJob] = useState<JobPosting | null>(null);
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isAccessRestricted, setIsAccessRestricted] = useState(false);

    useEffect(() => {
        if (!isValidJobPostingId) {
            return;
        }

        let cancelled = false;

        async function checkPermissions() {
            try {
                const profile = await getMyProfile();

                if (cancelled) return;

                if (!isReceiverAccount(profile.accountType)) {
                    setIsAccessRestricted(true);
                    // setLoadError('Only Receiver accounts can edit job postings.');
                    setIsAuthorized(false);
                    return;
                }

                const posting = await getJobPosting(jobPostingId);

                if (cancelled) return;

                // Only the company that owns the posting can edit it.
                if (posting.companyId !== profile.companyId) {
                    setLoadError(
                        'You are not authorized to edit this job posting.',
                    );
                    setIsAuthorized(false);
                    return;
                }

                if (posting.listingStatus !== 'OPEN') {
                    setLoadError('Only open job postings can be edited.');
                    setIsAuthorized(false);
                    return;
                }

                setJob(posting);
                setIsAuthorized(true);
            } catch (err: unknown) {
                if (cancelled) return;

                if (isNotSignedIn(err)) {
                    setIsRedirecting(true);
                    redirectToUnauthorized();
                    return;
                }

                setLoadError(describeError(err));
                setIsAuthorized(false);
            }
        }

        void checkPermissions();

        return () => {
            cancelled = true;
        };
    }, [jobPostingId, isValidJobPostingId]);

    if (!isValidJobPostingId) {
        return (
            <div className="flex flex-col items-center gap-4">
                <p className="type-sm text-danger text-center">
                    Invalid job posting ID.
                </p>

                <Link
                    href="/job-postings/mine"
                    className="type-sm text-[#497B93] underline"
                >
                    Back to My Jobs
                </Link>
            </div>
        );
    }

    if (isRedirecting) {
        return <div className="min-h-screen bg-surface" />;
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
    if (isAccessRestricted) {
        return (
            <UnauthorizedPage
                variant="danger"
                icon="shield"
                title="Access Restricted"
                badge="Insufficient permissions"
                message="Only Receiver accounts can edit job postings."
                showLogin={false}
            />
        );
    }

    if (!isAuthorized) {
        if (loadError) {
            return (
                <div className="flex flex-col min-h-screen items-center justify-center bg-surface px-6 gap-4">
                    <p className="type-sm text-danger text-center">
                        {loadError}
                    </p>
                    <Link
                        href="/job-postings/mine"
                        className="type-sm text-brand underline"
                    >
                        Back to My Jobs
                    </Link>
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
                            key={job.jobPostingId}
                            jobPostingId={job.jobPostingId}
                            initialJob={job}
                        />
                    )}
                </div>
            </div>
        </main>
    );
}
