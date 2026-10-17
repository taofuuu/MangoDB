import { useState } from 'react';
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
        proposal.sender?.companyName ??
        `Provider #${proposal.sender?.companyId}`;

    return (
        <>
            <div
                onClick={onSelect}
                className={`relative w-full bg-white rounded-xl p-5 cursor-pointer transition-all border shadow-sm hover:shadow-md ${
                    isSelected
                        ? proposal.proposalStatus === 'REJECTED'
                            ? 'border-[#C5483B] ring-2 ring-[#C5483B]/20'
                            : 'border-[#437788] ring-2 ring-[#437788]/20'
                        : proposal.proposalStatus === 'REJECTED'
                          ? 'border-[#C5483B]/20 hover:border-[#C5483B]/50'
                          : 'border-[#437788]/20 hover:border-[#437788]/50'
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
                                <span className="font-bold text-slate-800 text-sm">
                                    {companyName}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-[#497B93] mt-0.5">
                                <Calendar className="h-4 w-4 text-[#497B93]" />
                                <span>{formatDate(proposal.createdAt)}</span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-[#497B93] mt-1">
                                <div className="flex items-center gap-1 text-xs text-[#497B93]">
                                    <Tag className="h-4 w-4 text-[#497B93]" />
                                    <span>
                                        {formatBaht(proposal.proposalBudget)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-[#497B93]">
                                    <Clock className="h-4 w-4 text-[#497B93]" />
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
                                className="text-xs px-3 py-1 rounded-md text-[#C5483B] border border-[#C5483B] hover:bg-red-50 transition-colors"
                            >
                                ✕ Reject
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-3 ml-15">
                    <button
                        onClick={onSelect}
                        className="text-xs text-[#437788] border border-[#437788]/40 rounded-md px-3 py-0.5 hover:bg-[#437788]/10 transition-colors flex items-center gap-1"
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
