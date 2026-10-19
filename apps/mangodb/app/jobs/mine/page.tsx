import JobListPage from '@/components/jobs/JobListPage';
import { Suspense } from 'react';

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-surface" />}>
            <JobListPage view="mine" backHref="/profile/view" />
        </Suspense>
    );
}
