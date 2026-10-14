'use client';

import { useEffect, useState } from 'react';

import JobForm from '@/components/forms/JobForm';
import UnauthorizedPage from '@/components/auth/UnauthorizedPage';
import { getMyProfile } from '@/lib/companies';
import { isReceiverAccount } from '@/lib/roles';
import { redirectToUnauthorized } from '@/lib/session';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';

export default function CreateJobPage() {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        getMyProfile()
            .then((profile) => {
                const hasReceiverRole = isReceiverAccount(profile.accountType);
                setIsAuthorized(hasReceiverRole);
            })
            .catch((err: unknown) => {
                if (isNotSignedIn(err)) {
                    setLoadError(NOT_SIGNED_IN);
                    setIsAuthorized(false);
                    redirectToUnauthorized();
                    return;
                }

                setLoadError(describeError(err));
                setIsAuthorized(false);
            });
    }, []);

    // Wait until the user's role has been checked.
    if (isAuthorized === null && !loadError) {
        return <div className="min-h-screen bg-surface" />;
    }

    if (loadError === NOT_SIGNED_IN) {
        return <div className="min-h-screen bg-surface" />;
    }

    // Role-restricted for non-receivers
    if (isAuthorized === false && !loadError) {
        return (
            <UnauthorizedPage
                variant="danger"
                icon="shield"
                title="Access Restricted"
                badge="Insufficient permissions"
                message="You need a Receiver account to create job postings."
                showLogin={false}
            />
        );
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
