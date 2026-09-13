'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CompanyProfile } from '@mangodb/shared';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';
import { getMyProfile } from '@/lib/companies';
import ReceiverCompanyCard, {
    toReceiverCompanyCardData,
} from '@/components/viewprofile/ReceiverCompanyCard';
import JobListing from '@/components/viewprofile/JobListing';

export default function ReceiverViewPage() {
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        getMyProfile()
            .then(setProfile)
            .catch((err: unknown) => {
                if (isNotSignedIn(err)) {
                    setLoadError(NOT_SIGNED_IN);
                    return;
                }
                setLoadError(describeError(err));
            });
    }, []);

    return (
        <div className="min-h-screen bg-[#FFFDF9] p-6 lg:p-8">
            {loadError === NOT_SIGNED_IN && (
                <p className="text-sm">
                    You are not signed in.{' '}
                    <Link href="/login" className="underline">
                        Log in
                    </Link>
                    , then come back.
                </p>
            )}

            {loadError && loadError !== NOT_SIGNED_IN && (
                <p className="text-sm text-red-600">{loadError}</p>
            )}

            {!loadError && !profile && <p className="text-sm">Loading…</p>}

            {profile && (
                <main className="max-w-screen-2xl mx-auto flex flex-col lg:flex-row gap-5 items-stretch">
                    {/* Left Receiver Card */}
                    <aside className="w-full lg:w-[320px] flex-shrink-0">
                        <ReceiverCompanyCard
                            data={toReceiverCompanyCardData(profile)}
                        />
                    </aside>

                    {/* Right Job Listing Container */}
                    <section className="flex-1 w-full">
                        <JobListing />
                    </section>
                </main>
            )}
        </div>
    );
}
