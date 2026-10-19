'use client';

import { useId } from 'react';
import { MailCheck } from 'lucide-react';
import type { Job, Proposal } from '@mangodb/shared';
import ModalShell from '@/components/ui/ModalShell';
import { formatMonths } from '@/lib/dates';
import { formatBaht } from '@/lib/money';

type ProposalReceiptModalProps = {
    isOpen: boolean;
    // Only what the receipt names: the job and the company it went to.
    job: Pick<Job, 'listingTitle' | 'company'>;
    proposal: Proposal;
    onClose: () => void;
};

// What SubmitProposalModal shows once the proposal is sent.
export default function ProposalReceiptModal({
    isOpen,
    job,
    proposal,
    onClose,
}: ProposalReceiptModalProps) {
    const titleId = useId();

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            labelledBy={titleId}
            backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            panelClassName="w-[calc(100vw-2rem)] sm:w-[44.5833vw] max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl bg-surface p-[1.5vw] text-ink shadow-xl"
        >
            <div className="flex items-center gap-2">
                <MailCheck className="size-6 text-ink" aria-hidden="true" />
                <h2 id={titleId} className="type-md">
                    Proposal submitted
                </h2>
            </div>

            <p className="my-[2.22vh] type-md !font-[600]">
                Your proposal for {job.listingTitle} has been sent to{' '}
                {job.company.companyName}.
            </p>

            <div>
                <p className="type-sm text-ink">Proposal term</p>
                <p className="mt-1 whitespace-pre-wrap type-sm text-ink">
                    {proposal.proposalTerms}
                </p>
            </div>

            <dl className="mt-[2.22vh] grid grid-cols-2 gap-[3vw]">
                <div>
                    <dt className="type-sm text-ink">Your quoted price</dt>
                    <dd className="mt-1 type-sm text-ink">
                        {formatBaht(proposal.proposalBudget)}
                    </dd>
                </div>
                <div>
                    <dt className="type-sm text-ink">Estimated duration</dt>
                    <dd className="mt-1 type-sm text-ink">
                        {formatMonths(proposal.duration)}
                    </dd>
                </div>
            </dl>

            <hr className="mt-[2.22vh] border-line" />

            <div className="flex justify-end pt-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="h-[4vh] min-w-[80px] rounded-status bg-fill-muted px-6 type-sm font-[500] text-ink transition-colors hover:bg-line"
                >
                    Close
                </button>
            </div>
        </ModalShell>
    );
}
