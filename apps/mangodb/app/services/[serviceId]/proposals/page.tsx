'use client';

import { useParams } from 'next/navigation';
import { parseId } from '@/lib/api';
import ReceivedProposalsPage from '@/components/proposals/ReceivedProposalsPage';

// US2-16. The proposals sent to one of your services, opened from the service.
export default function ServiceProposalsPage() {
    return (
        <ReceivedProposalsPage
            listingType="SERVICE"
            listingId={parseId(useParams().serviceId)}
        />
    );
}
