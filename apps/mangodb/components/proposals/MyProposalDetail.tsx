'use client';

import type { ProviderProposal } from '@mangodb/shared';
import { CalendarDays, Clock, Tag, X } from 'lucide-react';
import CompanyAvatar from '@/components/viewprofile/CompanyAvatar';
import { formatProposalDateTime } from '@/lib/proposals';
import ProposalStatusBadge from './ProposalStatusBadge';

type MyProposalDetailProps = {
    proposal: ProviderProposal;
    onClose: () => void;
};

// Fixed en-US grouping (9,999), like SubmitProposalModal, so the price reads
// the same whatever the browser's locale is.
const PRICE_FORMAT = new Intl.NumberFormat('en-US');

function formatDuration(duration: number): string {
    return `${duration} ${duration === 1 ? 'month' : 'months'}`;
}

// The right-hand panel: everything the Provider sent, read back to them.
// Everything here is already in the list row, so opening it needs no request.
export default function MyProposalDetail({
    proposal,
    onClose,
}: MyProposalDetailProps) {
    const receiverName = proposal.receiver?.companyName ?? 'Unknown company';

    return (
        <section
            aria-label={`Proposal for ${proposal.listingTitle}`}
            className="flex max-h-[78vh] w-full min-w-0 flex-col rounded-popup border border-brand/40 bg-surface-white px-6 py-6 shadow-card lg:h-[80vh] lg:max-h-none lg:flex-1"
        >
            <div className="flex items-start gap-4">
                <CompanyAvatar
                    name={receiverName}
                    photoUrl={proposal.receiver?.companyPhoto ?? null}
                    size={56}
                />
                <div className="min-w-0 flex-1">
                    <h2 className="break-words type-md text-ink">
                        {proposal.listingTitle}
                    </h2>
                    <p className="type-xs text-brand">{receiverName}</p>
                    <p className="mt-0.5 flex items-center gap-1 type-xs text-brand">
                        <CalendarDays aria-hidden="true" className="size-4" />
                        <time dateTime={proposal.createdAt}>
                            {formatProposalDateTime(proposal.createdAt)}
                        </time>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close proposal detail"
                    className="rounded-full p-1 text-ink-placeholder hover:bg-fill-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
                >
                    <X aria-hidden="true" className="size-5" />
                </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-brand/60 pb-4">
                <div className="flex items-center gap-2 text-brand">
                    <Tag aria-hidden="true" className="size-6" />
                    <div className="type-xs">
                        <p>Offered Price</p>
                        <p className="text-ink">
                            {PRICE_FORMAT.format(proposal.proposalBudget)} baht
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-brand">
                    <Clock aria-hidden="true" className="size-6" />
                    <div className="type-xs">
                        <p>Estimated Duration</p>
                        <p className="text-ink">
                            {formatDuration(proposal.duration)}
                        </p>
                    </div>
                </div>
                <ProposalStatusBadge
                    status={proposal.proposalStatus}
                    className="ml-auto min-w-[5.5rem]"
                />
            </div>

            <h3 className="mt-4 type-sm !font-[700] text-ink">Proposal term</h3>
            <p className="mt-2 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words pr-2 type-sm leading-relaxed text-ink">
                {proposal.proposalTerms}
            </p>
        </section>
    );
}
