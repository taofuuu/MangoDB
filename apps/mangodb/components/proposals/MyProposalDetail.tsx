'use client';

import type { SentProposal } from '@mangodb/shared';
import { CalendarDays, Clock, Tag, X } from 'lucide-react';
import CompanyAvatar from '@/components/companies/CompanyAvatar';
import { formatDateTime, formatMonths } from '@/lib/dates';
import { formatBaht } from '@/lib/money';
import ProposalStatusBadge from './ProposalStatusBadge';
import { sentProposalKind } from './sentProposalKind';

type MyProposalDetailProps = {
    proposal: SentProposal;
    onClose: () => void;
};

// The right-hand panel: everything the company sent, read back to them. A
// Provider's job proposal and a Receiver's hire request share it. Everything
// here is already in the list row, so opening it needs no request.
export default function MyProposalDetail({
    proposal,
    onClose,
}: MyProposalDetailProps) {
    const receiverName = proposal.recipient?.companyName ?? 'Unknown company';
    const kind = sentProposalKind(proposal.listingType);

    return (
        <section
            aria-label={`${kind.label} for ${proposal.listingTitle}`}
            className="flex max-h-[78vh] w-full min-w-0 flex-col rounded-popup border border-brand/40 bg-surface-white px-6 py-6 shadow-card lg:h-[80vh] lg:max-h-none lg:flex-1"
        >
            <div className="flex items-start gap-4">
                <CompanyAvatar
                    name={receiverName}
                    photoUrl={proposal.recipient?.companyPhoto ?? null}
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
                            {formatDateTime(proposal.createdAt)}
                        </time>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={`Close ${kind.label.toLowerCase()} detail`}
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
                            {formatBaht(proposal.proposalBudget)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-brand">
                    <Clock aria-hidden="true" className="size-6" />
                    <div className="type-xs">
                        <p>Estimated Duration</p>
                        <p className="text-ink">
                            {formatMonths(proposal.duration)}
                        </p>
                    </div>
                </div>
                <ProposalStatusBadge
                    status={proposal.proposalStatus}
                    className="ml-auto min-w-[5.5rem]"
                />
            </div>

            <h3 className="mt-4 type-sm !font-[700] text-ink">
                {kind.termHeading}
            </h3>
            <p className="mt-2 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words pr-2 type-sm leading-relaxed text-ink">
                {proposal.proposalTerms}
            </p>
        </section>
    );
}
