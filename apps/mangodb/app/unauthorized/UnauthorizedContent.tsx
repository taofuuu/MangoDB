'use client';

import { useSearchParams } from 'next/navigation';
import UnauthorizedPage from '@/components/auth/UnauthorizedPage';

export default function UnauthorizedContent() {
    const searchParams = useSearchParams();
    const customMessage = searchParams.get('message');
    const returnUrl = searchParams.get('next');

    const loginHref = returnUrl
        ? `/login?next=${encodeURIComponent(returnUrl)}`
        : '/login';

    return (
        <UnauthorizedPage
            message={customMessage ?? undefined}
            loginHref={loginHref}
        />
    );
}
