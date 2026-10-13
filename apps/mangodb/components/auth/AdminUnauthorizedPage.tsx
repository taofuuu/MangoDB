'use client';

import UnauthorizedPage from './UnauthorizedPage';

export interface AdminUnauthorizedPageProps {
    isForbidden?: boolean;
}

export default function AdminUnauthorizedPage({
    isForbidden = false,
}: AdminUnauthorizedPageProps) {
    if (isForbidden) {
        return (
            <UnauthorizedPage
                variant="danger"
                icon="shield"
                title="Administrator Privileges Required"
                badge="Insufficient admin privileges"
                message="This management area requires administrator privileges. Your current account does not have access."
                showLogin={false}
            />
        );
    }

    return (
        <UnauthorizedPage
            variant="brand"
            icon="shield"
            title="Administrator Access Required"
            badge="Administrator access required"
            message="You must be signed in with an administrator account to view or manage this area."
            showLogin={false}
        />
    );
}
