'use client';

import { useState } from 'react';
import SubmitProposalModal from '@/components/proposals/SubmitProposalModal';
import Button from '@/components/ui/Button';

// Temporary T2.8.2 preview. US2-7 will replace this with the job-posting list
// and detail view, which supplies the real posting data to this modal.
const previewPosting = {
    listingTitle: 'DevOps & Infrastructure Setup',
    companyName: 'Example Company',
    minBudget: null,
    maxBudget: 1_000_000,
    deadline: '2026-08-30',
    locationPref: 'On-site Chonburi',
};

export default function JobPostingsPage() {
    const [isProposalOpen, setIsProposalOpen] = useState(false);

    return (
        <main className="min-h-screen bg-surface p-6 sm:p-10">
            <h1 className="type-lg">Job postings</h1>
            <p className="mt-2 type-sm text-ink-soft">
                Temporary preview for the T2.8.2 proposal-form layout.
            </p>

            <Button
                onClick={() => setIsProposalOpen(true)}
                className="mt-6 h-10 px-5 type-sm"
            >
                Submit proposal
            </Button>

            <SubmitProposalModal
                isOpen={isProposalOpen}
                onClose={() => setIsProposalOpen(false)}
                jobPosting={previewPosting}
                // Validation is handled inside the modal. T2.8.5 replaces
                // this preview callback with the proposal POST request.
                onSubmit={() => undefined}
            />
        </main>
    );
}
