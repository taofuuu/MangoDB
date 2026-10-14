import { Suspense } from 'react';
import UnauthorizedContent from './UnauthorizedContent';

export const metadata = {
    title: 'Login Required | MangoDB',
    description: 'You need to be logged in to access this page.',
};

export default function UnauthorizedRoutePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-surface" />}>
            <UnauthorizedContent />
        </Suspense>
    );
}
