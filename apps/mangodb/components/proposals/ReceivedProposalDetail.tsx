import { useState } from 'react';
import type { ReceivedProposal } from '@mangodb/shared';
import CompanyAvatar from '@/components/companies/CompanyAvatar';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ProposalStatusBadge from './ProposalStatusBadge';
import { CircleCheck, Clock, Calendar, Tag } from 'lucide-react';
import { formatDate, formatMonths } from '@/lib/dates';
import { formatBaht } from '@/lib/money';

interface ReceivedProposalDetailProps {
    proposal: ReceivedProposal;
    onClose: () => void;
    // Both throw on failure, so the dialog can show why.
    onAccept: () => Promise<void>;
    onReject: () => Promise<void>;
}

export default function ReceivedProposalDetail({
    proposal,
    onClose,
    onAccept,
    onReject,
}: ReceivedProposalDetailProps) {
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);

    const companyName =
        proposal.sender?.companyName ??
        `Provider #${proposal.sender?.companyId}`;

    return (
        <>
            <div
                className={`bg-white rounded-2xl p-6 border shadow-sm relative text-[#497B93] max-h-[80vh] overflow-y-auto ${
                    proposal.proposalStatus === 'REJECTED'
                        ? 'border-[#C5483B]'
                        : 'border-[#437788] ring-2 ring-[#437788]/10'
                }`}
            >
                <div className="flex items-start justify-between pb-4 border-b border-[#497B93]">
                    <div className="flex items-center gap-3">
                        <CompanyAvatar
                            name={companyName}
                            photoUrl={proposal.sender?.companyPhoto ?? null}
                            size={48}
                        />

                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">
                                    {proposal.sender?.companyName ||
                                        `Provider #${proposal.sender?.companyId}`}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 text-xs text-[#497B93] mt-0.5">
                                <Calendar className="h-4 w-4 text-[#497B93]" />
                                Submitted: {formatDate(proposal.createdAt)}
                            </div>

                            <div className="flex items-center gap-6 text-xs text-[#497B93] mt-2">
                                <div>
                                    <div className="text-[10px] text-[#497B93]">
                                        Offered Price
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-[#497B93]">
                                        <Tag className="h-4 w-4 text-[#497B93]" />
                                        <div className="font-semibold">
                                            {formatBaht(
                                                proposal.proposalBudget,
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] text-[#497B93]">
                                        Estimated Duration
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-[#497B93]">
                                        <Clock className="h-4 w-4 text-[#497B93]" />
                                        <div className="font-semibold">
                                            {formatMonths(proposal.duration)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {proposal.proposalStatus !== 'PENDING' ? (
                            <ProposalStatusBadge
                                status={proposal.proposalStatus}
                            />
                        ) : (
                            <>
                                <button
                                    onClick={() => setShowAcceptModal(true)}
                                    className="text-xs px-3 py-1 rounded-md text-[#3DA62F] border border-[#3DA62F] hover:bg-emerald-50 transition-colors"
                                >
                                    ✓ Accept
                                </button>
                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    className="text-xs px-3 py-1 rounded-md text-[#C5483B] border border-[#C5483B] hover:bg-red-50 transition-colors"
                                >
                                    ✕ Reject
                                </button>
                            </>
                        )}

                        <button
                            onClick={onClose}
                            className="ml-2 p-1.5 rounded-full text-[#497B93] hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="mt-5">
                    <h4 className="font-bold text-xs text-slate-800 mb-3">
                        Proposal Terms
                    </h4>
                    <div className="space-y-2 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {proposal.proposalTerms}
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showAcceptModal}
                onClose={() => setShowAcceptModal(false)}
                onConfirm={onAccept}
                title="Accept this proposal?"
                description={
                    <>
                        Please review the proposal details before accepting.
                        Once you accept, a project with{' '}
                        <strong>{companyName}</strong> will be created and your
                        job posting will close.
                    </>
                }
                icon={
                    <CircleCheck
                        aria-hidden="true"
                        className="h-[4.6vh] min-h-[38px] w-[3vw] min-w-[44px] shrink-0 text-brand"
                    />
                }
                confirmLabel="Accept proposal"
                confirmVariant="primary"
                pendingLabel="Accepting..."
            />

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
