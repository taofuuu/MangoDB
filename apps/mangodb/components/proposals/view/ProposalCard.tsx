import React, { useState } from 'react';
import Image from 'next/image';
import type { PostingProposal, ViewMode } from '@mangodb/shared';
import RejectProposalModal from './RejectProposalModal';
import { StarRating } from './StarRating';

interface ProposalCardProps {
    proposal: PostingProposal;
    isSelected: boolean;
    hasSelectedProposal: boolean;
    viewMode: ViewMode;
    onSelect: () => void;
    onReject: (e: React.MouseEvent) => void;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({
    proposal,
    isSelected,
    hasSelectedProposal,
    viewMode,
    onSelect,
    onReject,
}) => {
    const [showRejectModal, setShowRejectModal] = useState(false);

    const companyName =
        proposal.provider?.companyName ??
        `Provider #${proposal.provider?.companyId}`;

    return (
        <>
            <div
                onClick={onSelect}
                className={`relative w-full bg-white rounded-xl p-5 cursor-pointer transition-all border shadow-sm hover:shadow-md ${
                    isSelected
                        ? viewMode === 'rejected' ||
                          proposal.proposalStatus === 'REJECTED'
                            ? 'border-[#C5483B] ring-2 ring-[#C5483B]/20'
                            : 'border-[#437788] ring-2 ring-[#437788]/20'
                        : viewMode === 'rejected' ||
                            proposal.proposalStatus === 'REJECTED'
                          ? 'border-[#C5483B]/20 hover:border-[#C5483B]/50'
                          : 'border-[#437788]/20 hover:border-[#437788]/50'
                }`}
            >
                <div className="flex items-start justify-between">
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
                                <span className="font-bold text-slate-800 text-sm">
                                    {companyName}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                                <span>
                                    {new Date(
                                        proposal.createdAt,
                                    ).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                <span className="font-semibold text-slate-700">
                                    ${proposal.proposalBudget.toLocaleString()}
                                </span>
                                <span>
                                    {proposal.duration} month
                                    {proposal.duration > 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        {viewMode === 'rejected' ||
                        proposal.proposalStatus === 'REJECTED' ? (
                            <span className="text-[#C5483B] text-xs font-medium mr-2">
                                Rejected
                            </span>
                        ) : proposal.proposalStatus === 'ACCEPTED' ? (
                            <span className="text-emerald-500 text-xs font-medium mr-2">
                                Accepted
                            </span>
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
                    <button className="text-xs text-[#437788] border border-[#437788]/40 rounded-md px-3 py-0.5 hover:bg-[#437788]/10 transition-colors flex items-center gap-1">
                        view detail →
                    </button>
                </div>
            </div>

            <RejectProposalModal
                isOpen={showRejectModal}
                companyName={companyName}
                onClose={() => setShowRejectModal(false)}
                onConfirm={() => {
                    setShowRejectModal(false);
                    onReject({} as React.MouseEvent);
                }}
            />
        </>
    );
};
