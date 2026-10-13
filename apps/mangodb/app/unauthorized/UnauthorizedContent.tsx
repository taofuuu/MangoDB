'use client';

import { useSearchParams } from 'next/navigation';
import UnauthorizedPage from '@/components/auth/UnauthorizedPage';
import { sanitizeReturnUrl } from '@/lib/session';

export default function UnauthorizedContent() {
    const searchParams = useSearchParams();
    const customMessage = searchParams.get('message');
    const returnUrl = searchParams.get('next');
    const safeReturnUrl = sanitizeReturnUrl(returnUrl);

    const loginHref = safeReturnUrl
        ? `/login?next=${encodeURIComponent(safeReturnUrl)}`
        : '/login';

    return (
        <UnauthorizedPage
            message={customMessage ?? undefined}
            loginHref={loginHref}
        />
    );
}
