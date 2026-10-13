'use client';

import { buildAdminLoginUrl } from '@/lib/session';
import UnauthorizedPage from './UnauthorizedPage';

export interface AdminUnauthorizedPageProps {
    next?: string;
    isForbidden?: boolean;
    reason?: string;
    homeHref?: string;
    homeLabel?: string;
}

export default function AdminUnauthorizedPage({
    next,
    isForbidden = false,
    reason,
    homeHref = '/',
    homeLabel = 'Back to Home',
}: AdminUnauthorizedPageProps) {
    const loginHref = buildAdminLoginUrl(next);

    if (isForbidden) {
        return (
            <UnauthorizedPage
                variant="danger"
                icon="shield"
                title="Administrator Privileges Required"
                badge={reason ?? 'Administrator access required'}
                message="This management area requires administrator privileges. Your current account does not have access."
                homeHref={homeHref}
                homeLabel={homeLabel}
                loginHref={loginHref}
                loginLabel="Admin Login"
                showLogin={true}
            />
        );
    }

    return (
        <UnauthorizedPage
            variant="brand"
            icon="shield"
            title="Administrator Access Required"
            badge={reason ?? 'Missing or malformed Authorization'}
            message="You must be signed in with an administrator account to view or manage this area."
            homeHref={homeHref}
            homeLabel={homeLabel}
            loginHref={loginHref}
            loginLabel="Admin Login"
            showLogin={true}
        />
    );
}
