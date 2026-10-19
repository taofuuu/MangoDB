'use client';

import PageGate from '@/components/auth/PageGate';
import SearchServicesPage from '@/components/services/SearchServicesPage';
import { useMyCompany } from '@/lib/useMyCompany';

// Route: /services (mirrors API noun, see docs/conventions.md §2.9)
// US3-1 is a Receiver's search. GET /services stays open to providers too,
// because another company's profile lists its services through it.
export default function ServicesPage() {
    const me = useMyCompany('receiver');

    if (me.status !== 'ready') {
        return (
            <PageGate
                state={me}
                roleMessage="You need a Receiver account to search services."
            />
        );
    }

    return <SearchServicesPage mode="pagination" />;
}
