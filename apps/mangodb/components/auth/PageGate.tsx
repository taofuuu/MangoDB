'use client';

import type { ReactNode } from 'react';
import type { MyCompany } from '@/lib/useMyCompany';
import UnauthorizedPage from './UnauthorizedPage';

type PageGateProps = {
    state: Exclude<MyCompany, { status: 'ready' }>;
    // Why the account type cannot use the page, e.g. "You need a Receiver
    // account to create jobs."
    roleMessage?: ReactNode;
};

// What a page shows until useMyCompany is 'ready': a blank surface while it
// loads or redirects, Access Restricted for the wrong account type, and the
// error otherwise.
export default function PageGate({ state, roleMessage }: PageGateProps) {
    if (state.status === 'wrongRole') {
        return (
            <UnauthorizedPage
                variant="danger"
                icon="shield"
                title="Access Restricted"
                badge="Insufficient permissions"
                message={roleMessage}
                showLogin={false}
            />
        );
    }

    if (state.status === 'error') {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center px-6">
                <p role="alert" className="type-sm text-danger text-center">
                    Unable to load your account: {state.message}
                </p>
            </div>
        );
    }

    return <div className="min-h-screen bg-surface" />;
}
