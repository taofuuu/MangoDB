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
                className={`bg-surface-white rounded-2xl p-6 border shadow-sm relative text-brand max-h-[80vh] overflow-y-auto ${
                    proposal.proposalStatus === 'REJECTED'
                        ? 'border-danger'
                        : 'border-brand ring-2 ring-brand/10'
                }`}
            >
                <div className="flex items-start justify-between pb-4 border-b border-brand">
                    <div className="flex items-center gap-3">
                        <CompanyAvatar
                            name={companyName}
                            photoUrl={proposal.sender?.companyPhoto ?? null}
                            size={48}
                        />

                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-ink">
                                    {proposal.sender?.companyName ||
                                        `Provider #${proposal.sender?.companyId}`}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 type-xs text-brand mt-0.5">
                                <Calendar className="h-4 w-4 text-brand" />
                                Submitted: {formatDate(proposal.createdAt)}
                            </div>

                            <div className="flex items-center gap-6 type-xs text-brand mt-2">
                                <div>
                                    <div className="type-xs text-brand">
                                        Offered Price
                                    </div>
                                    <div className="flex items-center gap-1 type-xs text-brand">
                                        <Tag className="h-4 w-4 text-brand" />
                                        <div className="font-semibold">
                                            {formatBaht(
                                                proposal.proposalBudget,
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="type-xs text-brand">
                                        Estimated Duration
                                    </div>
                                    <div className="flex items-center gap-1 type-xs text-brand">
                                        <Clock className="h-4 w-4 text-brand" />
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
                                    className="type-xs px-3 py-1 rounded-md text-brand border border-brand hover:bg-brand-tint transition-colors"
                                >
                                    ✓ Accept
                                </button>
                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    className="type-xs px-3 py-1 rounded-md text-danger border border-danger hover:bg-danger-wash transition-colors"
                                >
                                    ✕ Reject
                                </button>
                            </>
                        )}

                        <button
                            onClick={onClose}
                            className="ml-2 p-1.5 rounded-full text-brand hover:text-ink-soft hover:bg-fill-subtle transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="mt-5">
                    <h4 className="!font-[700] type-xs text-ink mb-3">
                        Proposal Terms
                    </h4>
                    <div className="space-y-2 type-xs text-ink-soft leading-relaxed whitespace-pre-line">
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
