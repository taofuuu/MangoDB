'use client';

import { useEffect, useState } from 'react';
import type { CompanyProfile } from '@mangodb/shared';
import { describeError, isNotSignedIn } from './api';
import { getMyProfile } from './companies';
import { isProviderAccount, isReceiverAccount } from './roles';
import { redirectToUnauthorized } from './session';

export type MyCompany =
    | { status: 'loading' }
    // A 401. The page is already on its way to /unauthorized.
    | { status: 'signedOut' }
    // Signed in, but the account type cannot use this page.
    | { status: 'wrongRole' }
    | { status: 'error'; message: string }
    | { status: 'ready'; company: CompanyProfile };

// The signed-in company, for a page that needs one. With a role, a company
// that cannot act as it comes back 'wrongRole'; a BOTH company passes either.
// Until 'ready', render <PageGate state={...} />.
export function useMyCompany(role?: 'provider' | 'receiver'): MyCompany {
    const [state, setState] = useState<MyCompany>({ status: 'loading' });

    useEffect(() => {
        let cancelled = false;

        getMyProfile()
            .then((company) => {
                if (cancelled) return;
                const allowed =
                    role === 'provider'
                        ? isProviderAccount(company.accountType)
                        : role === 'receiver'
                          ? isReceiverAccount(company.accountType)
                          : true;
                setState(
                    allowed
                        ? { status: 'ready', company }
                        : { status: 'wrongRole' },
                );
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                if (isNotSignedIn(err)) {
                    setState({ status: 'signedOut' });
                    redirectToUnauthorized();
                    return;
                }
                setState({ status: 'error', message: describeError(err) });
            });

        return () => {
            cancelled = true;
        };
    }, [role]);

    return state;
}
