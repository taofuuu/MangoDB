import JobPostingsPage from '@/components/job/JobPostingsPage';
import { Suspense } from 'react';

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-surface" />}>
            <JobPostingsPage view="mine" backHref="/profile/view" />
        </Suspense>
    );
}
