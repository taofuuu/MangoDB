'use client';

import type { ProposalStatus, SentProposal } from '@mangodb/shared';
import { CalendarDays } from 'lucide-react';
import CompanyAvatar from '@/components/viewprofile/CompanyAvatar';
import { formatDateTime } from '@/lib/dates';
import ProposalStatusBadge from './ProposalStatusBadge';

// The card's outline follows its status, as in the design: blue when
// accepted, red when rejected, none (just the shadow) while pending.
const BORDER: Record<ProposalStatus, string> = {
    ACCEPTED: 'border-brand',
    PENDING: 'border-transparent',
    REJECTED: 'border-danger/70',
};

type MyProposalCardProps = {
    proposal: SentProposal;
    isSelected: boolean;
    // The detail panel is open, so the card is narrower: the date and badge
    // move under the title instead of sitting on the right.
    isCompact: boolean;
    onSelect: (proposal: SentProposal) => void;
};

export default function MyProposalCard({
    proposal,
    isSelected,
    isCompact,
    onSelect,
}: MyProposalCardProps) {
    const receiverName = proposal.recipient?.companyName ?? 'Unknown company';

    return (
        <button
            type="button"
            onClick={() => onSelect(proposal)}
            aria-pressed={isSelected}
            className={`flex w-full items-center gap-4 rounded-button border bg-surface-white px-5 py-4 text-left shadow-card transition hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                BORDER[proposal.proposalStatus]
            } ${isSelected ? 'ring-2 ring-brand/40' : ''}`}
        >
            <CompanyAvatar
                name={receiverName}
                photoUrl={proposal.recipient?.companyPhoto ?? null}
                size={48}
            />

            <div
                className={`flex min-w-0 flex-1 gap-2 ${
                    isCompact
                        ? 'flex-col'
                        : 'flex-col sm:flex-row sm:items-center sm:justify-between'
                }`}
            >
                <div className="min-w-0">
                    <h2 className="truncate type-md text-ink">
                        {proposal.listingTitle}
                    </h2>
                    <p className="truncate type-xs text-brand">
                        {receiverName}
                    </p>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-6">
                    <p className="flex items-center gap-1 whitespace-nowrap type-xs text-brand">
                        <CalendarDays aria-hidden="true" className="size-4" />
                        <time dateTime={proposal.createdAt}>
                            {formatDateTime(proposal.createdAt)}
                        </time>
                    </p>
                    <ProposalStatusBadge
                        status={proposal.proposalStatus}
                        className="min-w-[5.5rem]"
                    />
                </div>
            </div>
        </button>
    );
}
