'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ReceivedProposal } from '@mangodb/shared';
import type { ViewMode } from '@/components/proposals/StatsBadges';
import {
    listJobProposals,
    acceptProposal,
    rejectProposal,
} from '@/lib/proposals';
import { getJob } from '@/lib/jobs';
import { RECEIVED_PROPOSAL_PAGE_SIZE } from '@/lib/pagination';
import StatsBadges from '@/components/proposals/StatsBadges';
import ReceivedProposalCard from '@/components/proposals/ReceivedProposalCard';
import ReceivedProposalDetail from '@/components/proposals/ReceivedProposalDetail';
import {
    NOT_SIGNED_IN,
    describeError,
    isNotSignedIn,
    parseId,
} from '@/lib/api';
import { redirectToUnauthorized } from '@/lib/session';

const NOT_FOUND = 'This job could not be found.';

// Empty State Component
const EmptyState: React.FC<{ message?: string }> = ({
    message = 'No submitted proposals for this job yet.',
}) => (
    <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-28 h-28 mb-6 text-[#bdc3c7]">
            <svg
                width="100"
                height="100"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <g clipPath="url(#clip0_17_17355)">
                    <path
                        d="M3.09011 4.44C2.70011 4.83 2.70011 5.46 3.09011 5.85L5.12011 7.88L5.00011 8.01V19C5.00011 20.1 5.90011 21 7.00011 21H17.0001C17.3501 21 17.6801 20.9 17.9701 20.74L19.1401 21.91C19.5301 22.3 20.1601 22.3 20.5501 21.91C20.9401 21.52 20.9401 20.89 20.5501 20.5L4.50011 4.44C4.11011 4.05 3.48011 4.05 3.09011 4.44ZM19.0001 16.11V5C19.0001 3.9 18.1001 3 17.0001 3H10.0101L7.95011 5.06L19.0001 16.11Z"
                        fill="#bdc3c7"
                    />
                </g>
                <defs>
                    <clipPath id="clip0_17_17355">
                        <rect width="24" height="24" fill="white" />
                    </clipPath>
                </defs>
            </svg>
        </div>
        <p className="text-slate-500 font-normal text-sm text-center">
            {message}
        </p>
    </div>
);

// US2-10. The proposals sent to one of your jobs, opened from the job.
export default function JobProposalsPage() {
    const jobId = parseId(useParams().jobId);

    const [listingTitle, setListingTitle] = useState('Job Posting Proposals');
    const [proposals, setProposals] = useState<ReceivedProposal[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('all');
    const [isLoading, setIsLoading] = useState(jobId !== null);
    const [error, setError] = useState<string | null>(null);

    // The job gives the heading, and the list is its proposals. Only the
    // job's owner may read them; anyone else gets the API's 403 message.
    useEffect(() => {
        if (jobId === null) return;

        let isMounted = true;

        Promise.all([getJob(jobId), listJobProposals(jobId)])
            .then(([job, data]) => {
                if (!isMounted) return;
                setListingTitle(job.listingTitle);
                setProposals(data);
                setError(null);
            })
            .catch((err: unknown) => {
                if (!isMounted) return;
                if (isNotSignedIn(err)) {
                    setError(NOT_SIGNED_IN);
                    redirectToUnauthorized();
                    return;
                }
                setError(describeError(err, { 404: NOT_FOUND }));
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [jobId]);

    const activeError = jobId === null ? NOT_FOUND : error;
    const activeIsLoading = jobId !== null && isLoading;

    const totalCount = proposals.length;
    const rejectedCount = proposals.filter(
        (p) => p.proposalStatus === 'REJECTED',
    ).length;
    const remainCount = totalCount - rejectedCount;

    // Filter list based on active tab/view
    const activeList = proposals.filter((p) => {
        const isRejected = p.proposalStatus === 'REJECTED';
        return viewMode === 'rejected' ? isRejected : !isRejected;
    });

    const selectedProposal = proposals.find((p) => p.proposalId === selectedId);

    // Handle rejection via API call
    const handleReject = async (proposalId: number) => {
        try {
            await rejectProposal(proposalId);

            setProposals((prev) =>
                prev.map((p) =>
                    p.proposalId === proposalId
                        ? { ...p, proposalStatus: 'REJECTED' }
                        : p,
                ),
            );

            if (selectedId === proposalId) {
                setSelectedId(null);
            }
        } catch (err) {
            console.error('Failed to reject proposal:', err);
            alert(describeError(err));
        }
    };

    // Handle acceptance via API call
    const handleAccept = async (proposalId: number) => {
        try {
            await acceptProposal(proposalId);

            setProposals((prev) =>
                prev.map((p) => {
                    if (p.proposalId === proposalId) {
                        return { ...p, proposalStatus: 'ACCEPTED' };
                    }
                    if (p.proposalStatus === 'PENDING') {
                        return { ...p, proposalStatus: 'REJECTED' };
                    }
                    return p;
                }),
            );

            setSelectedId(null);
        } catch (err) {
            console.error('Failed to accept proposal:', err);
            alert(describeError(err));
        }
    };

    const [currentPage, setCurrentPage] = useState(1);

    // safePage clamps currentPage to valid range if totalPages shrinks
    const totalPages = Math.max(
        1,
        Math.ceil(activeList.length / RECEIVED_PROPOSAL_PAGE_SIZE),
    );
    const safePage = Math.min(currentPage, totalPages);
    const pagedList = activeList.slice(
        (safePage - 1) * RECEIVED_PROPOSAL_PAGE_SIZE,
        safePage * RECEIVED_PROPOSAL_PAGE_SIZE,
    );

    if (error === NOT_SIGNED_IN) {
        return <div className="min-h-screen bg-surface" />;
    }

    return (
        <div className="min-h-screen bg-[#FFFDF9] font-sans p-6 flex flex-col items-center">
            <div className="w-full max-w-6xl">
                {/* Main Header Title */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">
                        {viewMode === 'rejected'
                            ? 'Rejected Proposals'
                            : 'Submitted Proposals'}
                    </h1>
                    <h2 className="text-base font-semibold text-slate-700 mt-0.5">
                        {listingTitle}
                    </h2>
                    <div className="h-px bg-slate-200 mt-3 w-full" />
                </div>

                {/* Stats & View Switchers */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <StatsBadges
                        total={totalCount}
                        rejected={rejectedCount}
                        remain={remainCount}
                        viewMode={viewMode}
                        onSelectViewMode={(mode) => {
                            setViewMode(mode);
                            setSelectedId(null);
                            setCurrentPage(1);
                        }}
                    />

                    <button
                        onClick={() => {
                            setViewMode(
                                viewMode === 'all' ? 'rejected' : 'all',
                            );
                            setSelectedId(null);
                            setCurrentPage(1);
                        }}
                        disabled={rejectedCount === 0 && viewMode === 'all'}
                        className={`text-xs px-4 py-1.5 rounded-md font-medium transition-colors shadow-sm ${
                            rejectedCount === 0 && viewMode === 'all'
                                ? 'bg-slate-300 text-slate-100 cursor-not-allowed'
                                : 'bg-[#437788] text-white hover:bg-[#35616f]'
                        }`}
                    >
                        {viewMode === 'all'
                            ? 'view rejected proposal'
                            : 'back to all proposal'}
                    </button>
                </div>

                {/* Loading / Error / Empty States */}
                {activeIsLoading ? (
                    <div className="py-20 text-center text-slate-500 font-medium text-sm">
                        Loading proposals...
                    </div>
                ) : activeError ? (
                    <div className="py-20 text-center text-red-500 font-medium text-sm">
                        {activeError}
                    </div>
                ) : activeList.length === 0 ? (
                    <EmptyState
                        message={
                            viewMode === 'rejected'
                                ? 'No rejected proposals found.'
                                : 'No submitted proposals for this job yet.'
                        }
                    />
                ) : (
                    <div
                        className={`grid gap-6 transition-all ${
                            selectedProposal
                                ? 'grid-cols-1 lg:grid-cols-12'
                                : 'grid-cols-1'
                        }`}
                    >
                        {/* Left Column - Scrollable list + pagination */}
                        <div
                            className={`flex flex-col ${
                                selectedProposal ? 'lg:col-span-4' : 'max-w-6xl'
                            }`}
                        >
                            {/* Scrollable card area */}
                            <div className="overflow-y-auto max-h-[70vh] pr-1 space-y-4 ">
                                {pagedList.map((proposal) => (
                                    <ReceivedProposalCard
                                        key={proposal.proposalId}
                                        proposal={proposal}
                                        isSelected={
                                            proposal.proposalId === selectedId
                                        }
                                        hasSelectedProposal={selectedId != null}
                                        viewMode={viewMode}
                                        onSelect={() =>
                                            setSelectedId(
                                                selectedId ===
                                                    proposal.proposalId
                                                    ? null
                                                    : proposal.proposalId,
                                            )
                                        }
                                        onReject={() =>
                                            handleReject(proposal.proposalId)
                                        }
                                    />
                                ))}
                            </div>

                            {/* Pagination controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200">
                                    <span className="text-xs text-slate-500">
                                        Page {safePage} of {totalPages}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() =>
                                                setCurrentPage((p) =>
                                                    Math.max(1, p - 1),
                                                )
                                            }
                                            disabled={safePage === 1}
                                            className="px-3 py-1 text-xs rounded-md border border-[#437788] text-[#437788] hover:bg-[#437788]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            ← Prev
                                        </button>
                                        <button
                                            onClick={() =>
                                                setCurrentPage((p) =>
                                                    Math.min(totalPages, p + 1),
                                                )
                                            }
                                            disabled={safePage === totalPages}
                                            className="px-3 py-1 text-xs rounded-md border border-[#437788] text-[#437788] hover:bg-[#437788]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Next →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column - Proposal Detail View */}
                        {selectedProposal && (
                            <div className="lg:col-span-8">
                                <ReceivedProposalDetail
                                    proposal={selectedProposal}
                                    viewMode={viewMode}
                                    onClose={() => setSelectedId(null)}
                                    onAccept={() =>
                                        handleAccept(
                                            selectedProposal.proposalId,
                                        )
                                    }
                                    onReject={() =>
                                        handleReject(
                                            selectedProposal.proposalId,
                                        )
                                    }
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
