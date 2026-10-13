import JobPostingsPage from '@/components/job/JobPostingsPage';
import { Suspense } from 'react';

export default function Page() {
    return (
        <Suspense fallback={<div>Loading jobs...</div>}>
            <JobPostingsPage view="mine" />;
        </Suspense>
    );
}
