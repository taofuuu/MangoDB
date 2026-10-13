'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CompanyProfile } from '@mangodb/shared';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';
import { getMyProfile } from '@/lib/companies';
import { isProviderAccount, isReceiverAccount } from '@/lib/roles';
import ProviderProfileView from '@/components/viewprofile/ProviderProfileView';
import ReceiverProfileView from '@/components/viewprofile/ReceiverProfileView';
import UnauthorizedPage from '@/components/auth/UnauthorizedPage';
import { redirectToUnauthorized } from '@/lib/session';

// US1-4. One route for "my profile", rather than the /provider and /receiver
// pair it replaces. The role was never the caller's to choose: the layout
// follows from the company's own accountType, so putting it in the URL only
// created a page you could reach and should not have, which then needed a
// guard to take back.
export default function ViewProfilePage() {
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        getMyProfile()
            .then(setProfile)
            .catch((err: unknown) => {
                if (isNotSignedIn(err)) {
                    setLoadError(NOT_SIGNED_IN);
                    redirectToUnauthorized(
                        'You need to be logged in to view your company profile.',
                    );
                    return;
                }
                setLoadError(describeError(err));
            });
    }, []);

    if (loadError === NOT_SIGNED_IN) {
        return (
            <UnauthorizedPage message="You need to be logged in to view your company profile." />
        );
    }

    // Each view brings its own full-page layout, so they are returned whole
    // rather than dropped into a shared wrapper that fits neither.
    if (profile && isProviderAccount(profile.accountType)) {
        return <ProviderProfileView profile={profile} />;
    }

    if (profile && isReceiverAccount(profile.accountType)) {
        return <ReceiverProfileView profile={profile} />;
    }

    // Loading, an error, signed out, or an administrator — none of which has a
    // company profile to render.
    return (
        <div className="min-h-screen bg-surface p-6">
            {loadError && loadError !== NOT_SIGNED_IN && (
                <p role="alert" className="type-sm text-danger">
                    {loadError}
                </p>
            )}

            {!loadError && !profile && <p className="type-sm">Loading…</p>}

            {/* An administrator owns neither a provider nor a receiver row, so
                there is no company profile behind its account. */}
            {profile && (
                <p className="type-sm">
                    An administrator account has no company profile.{' '}
                    <Link href="/admin/companies" className="underline">
                        Manage companies
                    </Link>{' '}
                    instead.
                </p>
            )}
        </div>
    );
}
