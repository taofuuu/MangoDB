'use client';

import { useState } from 'react';
import type { CreateProposalRequest, Proposal } from '@mangodb/shared';
import SubmitProposalModal, {
    type ProposalJobPosting,
} from '@/components/proposals/SubmitProposalModal';
import Button from '@/components/ui/Button';

// Temporary local page for checking the T2.8 modal layout. The real job-detail
// page will supply its selected JobPosting when T2.7 integrates this component.
const previewPosting: ProposalJobPosting = {
    jobPostingId: 1,
    listingTitle: '<job posting name>',
    companyName: '<company name>',
    minBudget: null,
    maxBudget: 1_000_000,
    deadline: '2026-08-30',
    locationPref: 'On-site Chonburi',
};

function previewSubmitProposal(
    jobPostingId: number,
    body: CreateProposalRequest,
): Promise<Proposal> {
    return Promise.resolve({
        proposalId: 1,
        jobPostingId,
        providerId: 1,
        proposalBudget: body.proposalBudget,
        proposalTerms: body.proposalTerms,
        duration: body.duration,
        proposalStatus: 'PENDING',
        createdAt: new Date().toISOString(),
    });
}

export default function ProposalPreviewPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);

    return (
        <main className="min-h-screen bg-surface p-6 sm:p-10">
            <Button
                onClick={() => setIsFormOpen(true)}
                className="h-10 px-5 type-sm"
            >
                Open form
            </Button>

            <SubmitProposalModal
                isOpen={isFormOpen}
                jobPosting={previewPosting}
                onClose={() => setIsFormOpen(false)}
                submitProposal={previewSubmitProposal}
            />
        </main>
    );
}
