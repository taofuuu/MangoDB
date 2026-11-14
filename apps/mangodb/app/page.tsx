'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageGate from '@/components/auth/PageGate';
import { describeError, isNotSignedIn } from '@/lib/api';
import { getMyProfile } from '@/lib/companies';

// No landing page of its own (ADR 0014). Signed in goes to your own profile,
// signed out to login. The developer link list moved to /dev.
export default function Home() {
    const router = useRouter();
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        getMyProfile()
            .then((company) =>
                // An admin has no company profile, so it goes where admin
                // login sends it.
                router.replace(
                    company.accountType === 'ADMIN'
                        ? '/admin/companies'
                        : '/profile/view',
                ),
            )
            .catch((err: unknown) => {
                if (isNotSignedIn(err)) router.replace('/login');
                else setLoadError(describeError(err));
            });
    }, [router]);

    return (
        <PageGate
            state={
                loadError
                    ? { status: 'error', message: loadError }
                    : { status: 'loading' }
            }
        />
    );
}
