'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMyProfile } from './companies';
import { sanitizeReturnUrl } from './session';

// For /login and /register. A signed-in visitor has nothing to do there, and
// /register would quietly swap their session for a new account. Send them on
// the way a fresh login would: an admin to /admin/companies, a company to the
// ?next page or its own profile.
//
// Any failure (401 or not) leaves the form in place: signing in is the one
// thing this page can still offer.
export function useRedirectIfSignedIn(): void {
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;

        getMyProfile()
            .then((company) => {
                if (cancelled) return;
                if (company.accountType === 'ADMIN') {
                    router.replace('/admin/companies');
                    return;
                }
                // Read here, not with useSearchParams: /register has no
                // Suspense boundary, and this runs only in the browser.
                const next = sanitizeReturnUrl(
                    new URLSearchParams(window.location.search).get('next'),
                );
                router.replace(next ?? '/profile/view');
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [router]);
}
