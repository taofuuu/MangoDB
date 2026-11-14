import { useState } from 'react';
import Link from 'next/link';
import type { ReceivedProposal } from '@mangodb/shared';
import CompanyAvatar from '@/components/companies/CompanyAvatar';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ProposalStatusBadge from './ProposalStatusBadge';
import { Clock, Calendar, Tag } from 'lucide-react';
import { formatDate, formatMonths } from '@/lib/dates';
import { formatBaht } from '@/lib/money';

interface ReceivedProposalCardProps {
    proposal: ReceivedProposal;
    isSelected: boolean;
    hasSelectedProposal: boolean;
    onSelect: () => void;
    // Throws on failure, so the dialog can show why.
    onReject: () => Promise<void>;
}

export default function ReceivedProposalCard({
    proposal,
    isSelected,
    hasSelectedProposal,
    onSelect,
    onReject,
}: ReceivedProposalCardProps) {
    const [showRejectModal, setShowRejectModal] = useState(false);

    const companyName =
        proposal.sender.companyName || `Provider #${proposal.sender.companyId}`;

    return (
        <>
            <div
                onClick={onSelect}
                className={`relative w-full bg-surface-white rounded-xl p-5 cursor-pointer transition-all border shadow-sm hover:shadow-md ${
                    isSelected
                        ? proposal.proposalStatus === 'REJECTED'
                            ? 'border-danger ring-2 ring-danger/20'
                            : proposal.proposalStatus === 'PENDING'
                              ? 'border-accent ring-2 ring-accent/20'
                              : 'border-brand ring-2 ring-brand/20'
                        : proposal.proposalStatus === 'REJECTED'
                          ? 'border-danger/20 hover:border-danger/50'
                          : proposal.proposalStatus === 'PENDING'
                            ? 'border-accent/60 hover:border-accent'
                            : 'border-brand/20 hover:border-brand/50'
                }`}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <CompanyAvatar
                            name={companyName}
                            photoUrl={proposal.sender?.companyPhoto ?? null}
                            size={48}
                        />

                        <div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href={`/companies/${proposal.sender.companyId}`}
                                    onClick={(event) => event.stopPropagation()}
                                    className="!font-[700] text-ink type-sm hover:underline"
                                >
                                    {companyName}
                                </Link>
                            </div>

                            <div className="flex items-center gap-1.5 type-xs text-brand mt-0.5">
                                <Calendar className="h-4 w-4 text-brand" />
                                <span>{formatDate(proposal.createdAt)}</span>
                            </div>

                            <div className="flex items-center gap-3 type-xs text-brand mt-1">
                                <div className="flex items-center gap-1 type-xs text-brand">
                                    <Tag className="h-4 w-4 text-brand" />
                                    <span>
                                        {formatBaht(proposal.proposalBudget)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 type-xs text-brand">
                                    <Clock className="h-4 w-4 text-brand" />
                                    <span>
                                        {formatMonths(proposal.duration)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        {proposal.proposalStatus !== 'PENDING' ? (
                            <ProposalStatusBadge
                                status={proposal.proposalStatus}
                            />
                        ) : hasSelectedProposal ? null : (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowRejectModal(true);
                                }}
                                className="type-xs px-3 py-1 rounded-md text-danger border border-danger hover:bg-danger-wash transition-colors"
                            >
                                ✕ Reject
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-3 ml-15">
                    <button
                        onClick={onSelect}
                        className="type-xs text-brand border border-brand/40 rounded-md px-3 py-0.5 hover:bg-brand/10 transition-colors flex items-center gap-1"
                    >
                        view detail →
                    </button>
                </div>
            </div>

            <ConfirmModal
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                onConfirm={onReject}
                title="Reject this proposal?"
                description={
                    <>
                        The proposal from <strong>{companyName}</strong> will be
                        rejected. This can&apos;t be undone.
                    </>
                }
                confirmLabel="Reject proposal"
                pendingLabel="Rejecting..."
            />
        </>
    );
}
