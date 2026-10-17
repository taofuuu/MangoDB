'use client';

import Link from 'next/link';
import PageGate from '@/components/auth/PageGate';
import { isProviderAccount, isReceiverAccount } from '@/lib/roles';
import { useMyCompany } from '@/lib/useMyCompany';
import ProviderProfileView from '@/components/viewprofile/ProviderProfileView';
import ReceiverProfileView from '@/components/viewprofile/ReceiverProfileView';

// US1-4. One route for "my profile", rather than the /provider and /receiver
// pair it replaces. The role was never the caller's to choose: the layout
// follows from the company's own accountType, so putting it in the URL only
// created a page you could reach and should not have, which then needed a
// guard to take back.
export default function ViewProfilePage() {
    const me = useMyCompany();

    if (me.status !== 'ready') {
        return <PageGate state={me} />;
    }

    const profile = me.company;

    // Each view brings its own full-page layout, so they are returned whole
    // rather than dropped into a shared wrapper that fits neither.
    if (isProviderAccount(profile.accountType)) {
        return <ProviderProfileView profile={profile} />;
    }

    if (isReceiverAccount(profile.accountType)) {
        return <ReceiverProfileView profile={profile} />;
    }

    // An administrator owns neither a provider nor a receiver row, so there is
    // no company profile behind its account.
    return (
        <div className="min-h-screen bg-surface p-6">
            <p className="type-sm">
                An administrator account has no company profile.{' '}
                <Link href="/admin/companies" className="underline">
                    Manage companies
                </Link>{' '}
                instead.
            </p>
        </div>
    );
}
