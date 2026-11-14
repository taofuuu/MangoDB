'use client';

import { useEffect } from 'react';
import {
    useParams,
    useRouter,
    useSelectedLayoutSegment,
} from 'next/navigation';
import { parseId } from '@/lib/api';
import { useMyCompany } from '@/lib/useMyCompany';

// Your own version of each page under /companies/:companyId. A page with none
// stays the read-only view.
const OWN_PAGES: Partial<Record<string, string>> = {
    jobs: '/jobs/mine',
    services: '/services/mine',
    portfolios: '/portfolios',
    certificates: '/certificates',
};

// #200. Links build /companies/:companyId without knowing who is looking, so
// your own company opened read-only, as if it were someone else's. One check
// here covers every link: yours goes to your own page, which can edit.
export default function CompanyLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const companyId = parseId(useParams().companyId);
    const segment = useSelectedLayoutSegment();
    const router = useRouter();
    const me = useMyCompany();

    const redirectTo =
        me.status === 'ready' && me.company.companyId === companyId
            ? segment === null
                ? '/profile/view'
                : OWN_PAGES[segment]
            : undefined;

    useEffect(() => {
        if (redirectTo) router.replace(redirectTo);
    }, [redirectTo, router]);

    // Blank until we know whose company it is, so yours never flashes up
    // read-only. getMyProfile is cached and the navbar already asked for it.
    if (me.status === 'loading' || redirectTo) {
        return <div className="min-h-screen bg-surface" />;
    }

    return children;
}
