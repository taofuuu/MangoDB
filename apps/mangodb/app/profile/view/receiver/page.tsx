'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CompanyProfile } from '@mangodb/shared';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';
import { getMyProfile } from '@/lib/companies';
import { isProviderAccount, isReceiverAccount } from '@/lib/roles';
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

    // This page renders the caller's own profile in a receiver's shape — the
    // job listings it has posted. A provider-only company owns none of that,
    // so without this it saw an empty receiver profile that looked like its
    // own.
    const isWrongRole =
        profile !== null && !isReceiverAccount(profile.accountType);

    return (
        <div className="min-h-screen bg-surface p-6 lg:p-8">
            {loadError === NOT_SIGNED_IN && (
                <p className="type-sm">
                    You are not signed in.{' '}
                    <Link href="/login" className="underline">
                        Log in
                    </Link>
                    , then come back.
                </p>
            )}

            {loadError && loadError !== NOT_SIGNED_IN && (
                <p className="type-sm text-red-600">{loadError}</p>
            )}

            {!loadError && !profile && <p className="type-sm">Loading…</p>}

            {isWrongRole && (
                <p className="type-sm">
                    This is the receiver view, and your account is not
                    registered as a receiver.
                    {isProviderAccount(profile.accountType) && (
                        <>
                            {' '}
                            <Link
                                href="/profile/view/provider"
                                className="underline"
                            >
                                View your provider profile
                            </Link>{' '}
                            instead.
                        </>
                    )}
                </p>
            )}

            {profile && !isWrongRole && (
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
