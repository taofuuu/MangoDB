'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { PublicCompanyProfile } from '@mangodb/shared';
import {
    ApiRequestError,
    NOT_SIGNED_IN,
    describeError,
    isNotSignedIn,
} from '@/lib/api';
import { getPublicCompanyProfile } from '@/lib/companies';
import { isProviderAccount, isReceiverAccount } from '@/lib/roles';
import ProviderProfileView from '@/components/viewprofile/ProviderProfileView';
import ReceiverProfileView from '@/components/viewprofile/ReceiverProfileView';

// The API's ids are int4, so anything else could never name a company. Caught
// here rather than sent, because the API answers a malformed id with 400, and
// to the reader "/profile/abc" is just as much a company that is not there.
const MAX_INT4 = 2_147_483_647;

function parseCompanyId(raw: string | string[] | undefined): number | null {
    if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return null;

    const id = Number(raw);
    return id >= 1 && id <= MAX_INT4 ? id : null;
}

const NOT_FOUND = 'not-found';
const ADMIN = 'admin';

// Tagged with the id it answers, so a stale answer from the previous company
// reads as "still loading" instead of showing the wrong profile while the next
// one is in flight.
type LoadResult =
    | { companyId: number; profile: PublicCompanyProfile }
    | { companyId: number; error: string };

function toLoadError(err: unknown): string {
    if (isNotSignedIn(err)) return NOT_SIGNED_IN;
    if (err instanceof ApiRequestError) {
        // Unknown, soft-deleted, and administrator accounts are all 404.
        if (err.status === 404) return NOT_FOUND;
        // The route is for companies; an administrator has its own account
        // pages and the API turns it away.
        if (err.status === 403) return ADMIN;
    }
    return describeError(err);
}

// T2.7.17. Another company's profile: the same views as /profile/view, from
// GET /companies/:companyId, with nothing on them that edits. The layout
// follows the company's accountType, exactly as it does for your own.
export default function CompanyProfilePage() {
    const companyId = parseCompanyId(useParams().companyId);
    const [result, setResult] = useState<LoadResult | null>(null);

    useEffect(() => {
        if (companyId === null) return;

        let cancelled = false;
        getPublicCompanyProfile(companyId)
            .then((profile) => {
                if (!cancelled) setResult({ companyId, profile });
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setResult({ companyId, error: toLoadError(err) });
                }
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

    if (profile && isProviderAccount(profile.accountType)) {
        return <ProviderProfileView profile={profile} readOnly />;
    }

    if (profile && isReceiverAccount(profile.accountType)) {
        return <ReceiverProfileView profile={profile} readOnly />;
    }

    return (
        <div className="min-h-screen bg-surface p-6">
            {loadError === NOT_SIGNED_IN && (
                <p className="type-sm">
                    You are not signed in.{' '}
                    <Link href="/login" className="underline">
                        Log in
                    </Link>
                    , then come back.
                </p>
            )}

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

            {loadError &&
                loadError !== NOT_SIGNED_IN &&
                loadError !== NOT_FOUND &&
                loadError !== ADMIN && (
                    <p role="alert" className="type-sm text-danger">
                        {loadError}
                    </p>
                )}

            {!loadError && !profile && <p className="type-sm">Loading…</p>}
        </div>
    );
}
