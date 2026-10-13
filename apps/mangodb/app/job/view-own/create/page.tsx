'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import JobForm from '@/components/forms/JobForm';
import UnauthorizedPage from '@/components/service/UnauthorizedPage';
import { getMyProfile } from '@/lib/companies';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';

export default function CreateJobPage() {
    const router = useRouter();

    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        getMyProfile()
            .then((profile) => {
                const hasReceiverRole =
                    profile.accountType === 'RECEIVER' ||
                    profile.accountType === 'BOTH';

                setIsAuthorized(hasReceiverRole);

                if (!hasReceiverRole) {
                    router.replace('/job/view-own');
                }
            })
            .catch((err: unknown) => {
                if (isNotSignedIn(err)) {
                    setLoadError(NOT_SIGNED_IN);
                    setIsAuthorized(false);
                    return;
                }

                setLoadError(describeError(err));
                setIsAuthorized(false);
            });
    }, [router]);

    // Wait until the user's role has been checked.
    if (isAuthorized === null) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <p className="type-sm text-ink-placeholder">
                    Checking permissions...
                </p>
            </div>
        );
    }

    // Do not render the create form for unauthorized users.
    if (!isAuthorized) {
        if (loadError === NOT_SIGNED_IN) {
            return <UnauthorizedPage />;
        }

        if (loadError) {
            return (
                <div className="min-h-screen bg-surface flex items-center justify-center px-6">
                    <p className="type-sm text-danger text-center">
                        Unable to verify your permissions: {loadError}
                    </p>
                </div>
            );
        }

        return null;
    }

    return (
        <main className="min-h-screen bg-surface px-[1.67vw] py-[2.96vh] text-ink">
            <div className="ml-[9vw] flex w-full max-w-5xl flex-col gap-[1.94vh]">
                <h1 className="type-hd">Create Your Job Posting</h1>

                <hr className="w-[80.9375vw] border-brand-dark/50" />

                <p className="type-md !font-[600]">*Indicates required</p>

                <div className="mt-[1px] ml-[7vw] flex w-full justify-center">
                    <JobForm />
                </div>
            </div>
        </main>
    );
}
