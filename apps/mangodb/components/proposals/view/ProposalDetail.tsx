import React, { useState } from 'react';
import type { ReceivedProposal } from '@mangodb/shared';
import type { ViewMode } from './StatsBadges';
import Image from 'next/image';
import AcceptProposalModal from './AcceptProposalModal';
import RejectProposalModal from './RejectProposalModal';
import { Clock, Calendar, Tag } from 'lucide-react';

interface ProposalDetailProps {
    proposal: ReceivedProposal;
    viewMode: ViewMode;
    onClose: () => void;
    onAccept?: () => void;
    onReject?: () => void;
}

export const ProposalDetail: React.FC<ProposalDetailProps> = ({
    proposal,
    viewMode,
    onClose,
    onAccept,
    onReject,
}) => {
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);

    const companyName =
        proposal.sender?.companyName ??
        `Provider #${proposal.sender?.companyId}`;

    const handleConfirmAccept = () => {
        setShowAcceptModal(false);
        onAccept?.();
    };

    const handleConfirmReject = () => {
        setShowRejectModal(false);
        onReject?.();
    };
    return (
        <>
            <div
                className={`bg-white rounded-2xl p-6 border shadow-sm relative text-[#497B93] max-h-[80vh] overflow-y-auto ${
                    viewMode === 'rejected' ||
                    proposal.proposalStatus === 'REJECTED'
                        ? 'border-[#C5483B]'
                        : 'border-[#437788] ring-2 ring-[#437788]/10'
                }`}
            >
                <div className="flex items-start justify-between pb-4 border-b border-[#497B93]">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#437788] flex-shrink-0 flex items-center justify-center text-white overflow-hidden">
                            {proposal.sender?.companyPhoto ? (
                                <div className="relative w-full h-full overflow-hidden">
                                    <Image
                                        src={proposal.sender.companyPhoto}
                                        alt={proposal.sender.companyName}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <svg
                                    className="w-6 h-6"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">
                                    {proposal.sender?.companyName ||
                                        `Provider #${proposal.sender?.companyId}`}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 text-xs text-[#497B93] mt-0.5">
                                <Calendar className="h-4 w-4 text-[#497B93]" />
                                Submitted:{' '}
                                {new Date(
                                    proposal.createdAt,
                                ).toLocaleDateString()}
                            </div>

                            <div className="flex items-center gap-6 text-xs text-[#497B93] mt-2">
                                <div>
                                    <div className="text-[10px] text-[#497B93]">
                                        Offered Price
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-[#497B93]">
                                        <Tag className="h-4 w-4 text-[#497B93]" />
                                        <div className="font-semibold">
                                            {proposal.proposalBudget.toLocaleString()}
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
                                            {proposal.duration} month
                                            {proposal.duration > 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {viewMode === 'rejected' ||
                        proposal.proposalStatus === 'REJECTED' ? (
                            <span className="text-[#C5483B] text-xs font-semibold mr-2">
                                Rejected
                            </span>
                        ) : proposal.proposalStatus === 'ACCEPTED' ? (
                            <span className="text-[#3DA62F] text-xs font-semibold mr-2">
                                Accepted
                            </span>
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

            <AcceptProposalModal
                isOpen={showAcceptModal}
                companyName={companyName}
                onClose={() => setShowAcceptModal(false)}
                onConfirm={handleConfirmAccept}
            />

            <RejectProposalModal
                isOpen={showRejectModal}
                companyName={companyName}
                onClose={() => setShowRejectModal(false)}
                onConfirm={handleConfirmReject}
            />
        </>
    );
};
