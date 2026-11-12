'use client';

import { useParams } from 'next/navigation';
import { parseId } from '@/lib/api';
import ReceivedProposalsPage from '@/components/proposals/ReceivedProposalsPage';

// US2-10. The proposals sent to one of your jobs, opened from the job.
export default function JobProposalsPage() {
    return (
        <ReceivedProposalsPage
            listingType="JOB"
            listingId={parseId(useParams().jobId)}
        />
    );
}
