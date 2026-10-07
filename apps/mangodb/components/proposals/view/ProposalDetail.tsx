import React from 'react';
import type { PostingProposal, ViewMode } from '@mangodb/shared';
import Image from 'next/image';

interface ProposalDetailProps {
    proposal: PostingProposal;
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
    return (
        <div
            className={`bg-white rounded-2xl p-6 border shadow-sm relative text-slate-700 max-h-[80vh] overflow-y-auto ${
                viewMode === 'rejected' ||
                proposal.proposalStatus === 'REJECTED'
                    ? 'border-red-200'
                    : 'border-[#2d8ba8] ring-2 ring-[#2d8ba8]/10'
            }`}
        >
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#437788] flex-shrink-0 flex items-center justify-center text-white overflow-hidden">
                        {proposal.provider?.companyPhoto ? (
                            <Image
                                src={proposal.provider.companyPhoto}
                                alt={proposal.provider.companyName}
                                className="w-full h-full object-cover"
                            />
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
                                {proposal.provider?.companyName ||
                                    `Provider #${proposal.provider?.companyId}`}
                            </span>
                        </div>

                        <div className="text-xs text-slate-400 mt-0.5">
                            Submitted:{' '}
                            {new Date(proposal.createdAt).toLocaleDateString()}
                        </div>

                        <div className="flex items-center gap-6 text-xs text-slate-500 mt-2">
                            <div>
                                <div className="text-[10px] text-slate-400">
                                    Offered Price
                                </div>
                                <div className="font-semibold text-slate-800">
                                    ${proposal.proposalBudget.toLocaleString()}
                                </div>
                            </div>

                            <div>
                                <div className="text-[10px] text-slate-400">
                                    Estimated Duration
                                </div>
                                <div className="font-semibold text-slate-800">
                                    {proposal.duration} month
                                    {proposal.duration > 1 ? 's' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {viewMode === 'rejected' ||
                    proposal.proposalStatus === 'REJECTED' ? (
                        <span className="text-red-400 text-xs font-semibold mr-2">
                            Rejected
                        </span>
                    ) : proposal.proposalStatus === 'ACCEPTED' ? (
                        <span className="text-emerald-600 text-xs font-semibold mr-2">
                            Accepted
                        </span>
                    ) : (
                        <>
                            <button
                                onClick={onAccept}
                                className="text-xs px-3 py-1 rounded-md text-emerald-600 border border-emerald-300 hover:bg-emerald-50 transition-colors"
                            >
                                ✓ Accept
                            </button>
                            <button
                                onClick={onReject}
                                className="text-xs px-3 py-1 rounded-md text-red-400 border border-red-200 hover:bg-red-50 transition-colors"
                            >
                                ✕ Reject
                            </button>
                        </>
                    )}

                    <button
                        onClick={onClose}
                        className="ml-2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
    );
};
