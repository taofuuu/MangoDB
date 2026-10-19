'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { PublicCompanyProfile } from '@mangodb/shared';
import {
    NOT_SIGNED_IN,
    describeError,
    isNotSignedIn,
    parseId,
} from '@/lib/api';
import { getCompanyProfile } from '@/lib/companies';
import { isProviderAccount, isReceiverAccount } from '@/lib/roles';
import ProviderProfileView from '@/components/profile/ProviderProfileView';
import ReceiverProfileView from '@/components/profile/ReceiverProfileView';
import { redirectToUnauthorized } from '@/lib/session';

const NOT_FOUND = 'not-found';
const ADMIN = 'admin';

// Tagged with the id it answers, so a stale answer from the previous company
// reads as "still loading" instead of showing the wrong profile while the next
// one is in flight.
type LoadResult =
    | { companyId: number; profile: PublicCompanyProfile }
    | { companyId: number; error: string };

// T2.7.17. Another company's profile: the same views as /profile/view, from
// GET /companies/:companyId, with nothing on them that edits. The layout
// follows the company's accountType, exactly as it does for your own.
export default function CompanyProfilePage() {
    const companyId = parseId(useParams().companyId);
    const [result, setResult] = useState<LoadResult | null>(null);

    useEffect(() => {
        if (companyId === null) return;

        let cancelled = false;
        getCompanyProfile(companyId)
            .then((profile) => {
                if (!cancelled) setResult({ companyId, profile });
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                if (isNotSignedIn(err)) {
                    setResult({ companyId, error: NOT_SIGNED_IN });
                    redirectToUnauthorized();
                    return;
                }
                // Unknown, soft-deleted and administrator accounts are all
                // 404. A 403 is an administrator caller: it has its own
                // account pages and the API turns it away.
                setResult({
                    companyId,
                    error: describeError(err, { 404: NOT_FOUND, 403: ADMIN }),
                });
            });

        return () => {
            cancelled = true;
        };
    }, [companyId]);

    const current =
        companyId !== null && result?.companyId === companyId ? result : null;
    const profile = current && 'profile' in current ? current.profile : null;
    const loadError =
        companyId === null
            ? NOT_FOUND
            : current && 'error' in current
              ? current.error
              : null;

    if (loadError === NOT_SIGNED_IN) {
        return <div className="min-h-screen bg-surface" />;
    }

    if (profile && isProviderAccount(profile.accountType)) {
        return <ProviderProfileView profile={profile} readOnly />;
    }

    if (profile && isReceiverAccount(profile.accountType)) {
        return <ReceiverProfileView profile={profile} readOnly />;
    }

    return (
        <div className="min-h-screen bg-surface p-6">
            {loadError === NOT_FOUND && (
                <p className="type-sm">
                    This company could not be found. It may have deleted its
                    account.{' '}
                    <Link href="/companies" className="underline">
                        Search companies
                    </Link>
                </p>
            )}

            {loadError === ADMIN && (
                <p className="type-sm">
                    An administrator views companies from{' '}
                    <Link href="/admin/companies" className="underline">
                        Manage companies
                    </Link>
                    .
                </p>
            )}

            {loadError && loadError !== NOT_FOUND && loadError !== ADMIN && (
                <p role="alert" className="type-sm text-danger">
                    {loadError}
                </p>
            )}

            {!loadError && !profile && <p className="type-sm">Loading…</p>}
        </div>
    );
}
