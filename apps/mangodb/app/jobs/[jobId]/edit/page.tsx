'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Job } from '@mangodb/shared';
import JobForm from '@/components/jobs/JobForm';
import PageGate from '@/components/auth/PageGate';
import { describeError, isNotSignedIn, parseId } from '@/lib/api';
import { getJob } from '@/lib/jobs';
import { redirectToUnauthorized } from '@/lib/session';
import { useMyCompany } from '@/lib/useMyCompany';

// Tagged with the id it answers, so moving to another job shows the blank
// surface instead of the previous job's form.
type LoadResult =
    { jobId: number; job: Job } | { jobId: number; error: string };

// Why the form cannot open, with the way back.
function CannotEdit({ message }: { message: string }) {
    return (
        <div className="flex flex-col min-h-screen items-center justify-center bg-surface px-6 gap-4">
            <p className="type-sm text-danger text-center">{message}</p>
            <Link
                href="/jobs/mine"
                className="rounded-button bg-brand px-4 py-2 type-sm text-surface-white hover:bg-brand-dark"
            >
                Back to My Jobs
            </Link>
        </div>
    );
}

export default function EditJobPage() {
    const jobId = parseId(useParams().jobId);
    const me = useMyCompany('receiver');
    const companyId = me.status === 'ready' ? me.company.companyId : null;
    const [result, setResult] = useState<LoadResult | null>(null);

    useEffect(() => {
        if (jobId === null || companyId === null) return;

        let cancelled = false;
        getJob(jobId)
            .then((job) => {
                if (cancelled) return;
                // Only the company that owns the job can edit it.
                if (job.company.companyId !== companyId) {
                    setResult({
                        jobId,
                        error: 'You are not authorized to edit this job posting.',
                    });
                } else if (job.listingStatus !== 'OPEN') {
                    setResult({
                        jobId,
                        error: 'Only open job postings can be edited.',
                    });
                } else {
                    setResult({ jobId, job });
                }
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                if (isNotSignedIn(err)) {
                    redirectToUnauthorized();
                    return;
                }
                setResult({ jobId, error: describeError(err) });
            });

        return () => {
            cancelled = true;
        };
    }, [jobId, companyId]);

    if (jobId === null) {
        return <CannotEdit message="Invalid job posting ID." />;
    }

    if (me.status !== 'ready') {
        return (
            <PageGate
                state={me}
                roleMessage="Only Receiver accounts can edit job postings."
            />
        );
    }

    const current = result?.jobId === jobId ? result : null;

    if (current && 'error' in current) {
        return <CannotEdit message={current.error} />;
    }

    if (!current) {
        return <div className="min-h-screen bg-surface" />;
    }

    return (
        <main className="min-h-screen bg-surface px-[1.67vw] py-[2.96vh] text-ink">
            <div className="ml-[9vw] flex w-full max-w-5xl flex-col gap-[1.94vh]">
                <h1 className="type-hd">Edit Your Job Posting</h1>

                <hr className="w-[80.9375vw] border-brand-dark/50" />

                <p className="type-md !font-[600]">*Indicates required</p>

                <div className="mt-[1px] ml-[7vw] flex w-full justify-center">
                    <JobForm key={current.job.jobId} initialJob={current.job} />
                </div>
            </div>
        </main>
    );
}
