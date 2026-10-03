'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CompanyProfile } from '@mangodb/shared';
import SubmitProposalModal, {
    type ProposalJobPosting,
} from '@/components/proposals/SubmitProposalModal';
import Button from '@/components/ui/Button';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';
import { getMyProfile } from '@/lib/companies';
import { isProviderAccount } from '@/lib/roles';

// Temporary local page for checking the T2.8 modal layout. The real job-detail
// page will supply its selected JobPosting when T2.7 integrates this component.
// TODO(T2.7): apply this same session/Provider guard before showing its trigger.
const previewPosting: ProposalJobPosting = {
    jobPostingId: 1,
    listingTitle: '<job posting name>',
    companyName: '<company name>',
    minBudget: null,
    maxBudget: 1_000_000,
    deadline: '2026-08-30',
    locationPref: 'On-site Chonburi',
};

export default function ProposalPreviewPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    // This client check controls what the page renders. The proposal endpoint
    // still enforces requireAuth + Provider/BOTH on every submission.
    useEffect(() => {
        getMyProfile()
            .then(setProfile)
            .catch((cause: unknown) => {
                if (isNotSignedIn(cause)) {
                    setLoadError(NOT_SIGNED_IN);
                    return;
                }

                setLoadError(describeError(cause));
            });
    }, []);

    return (
        <main className="min-h-screen bg-surface p-6 sm:p-10">
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
                <p role="alert" className="type-sm text-danger">
                    {loadError}
                </p>
            )}

            {!loadError && !profile && <p className="type-sm">Loading…</p>}

            {profile && !isProviderAccount(profile.accountType) && (
                <p className="type-sm">
                    Only Provider and BOTH accounts can submit proposals.
                </p>
            )}

            {profile && isProviderAccount(profile.accountType) && (
                <>
                    <Button
                        onClick={() => setIsFormOpen(true)}
                        className="h-10 px-5 type-sm"
                    >
                        Open form
                    </Button>

                    <SubmitProposalModal
                        isOpen={isFormOpen}
                        jobPosting={previewPosting}
                        onClose={() => setIsFormOpen(false)}
                    />
                </>
            )}
        </main>
    );
}
