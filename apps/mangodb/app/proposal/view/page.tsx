'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { JobPosting, PostingProposal, ViewMode } from '@mangodb/shared';
import {
    getSubmittedProposals,
    acceptProposal,
    rejectProposal,
} from '@/lib/proposals';
import { getJobPosting } from '@/lib/jobPostings';
import { StatsBadges } from '@/components/proposals/view/StatsBadges';
import { ProposalCard } from '@/components/proposals/view/ProposalCard';
import { ProposalDetail } from '@/components/proposals/view/ProposalDetail';
import { describeError } from '@/lib/api';

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

interface ProposalPageInnerProps {
    initialJobPostingId?: number | undefined;
    initialJobTitle?: string | undefined;
}

function ProposalPageInner({
    initialJobPostingId,
    initialJobTitle,
}: ProposalPageInnerProps) {
    const searchParams = useSearchParams();
    const queryId = searchParams.get('jobPostingId') || searchParams.get('id');
    const parsedJobId = queryId ? Number(queryId) : undefined;
    const effectiveJobId =
        initialJobPostingId ??
        (parsedJobId && !isNaN(parsedJobId) ? parsedJobId : undefined);

    const [listingTitle, setListingTitle] = useState<string>(
        initialJobTitle || searchParams.get('title') || 'Job Posting Proposals',
    );
    const [proposals, setProposals] = useState<PostingProposal[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('all');

    // Initialize loading to true only if effectiveJobId exists
    const [isLoading, setIsLoading] = useState<boolean>(
        Boolean(effectiveJobId),
    );
    const [error, setError] = useState<string | null>(null);

    // Fetch job posting title if id is provided but title is default
    useEffect(() => {
        if (!effectiveJobId) return;

        if (!initialJobTitle && !searchParams.get('title')) {
            getJobPosting(effectiveJobId)
                .then((job: JobPosting) => {
                    if (job?.listingTitle) {
                        setListingTitle(job.listingTitle);
                    }
                })
                .catch(() => {
                    // Ignore failure to fetch title, keep fallback
                });
        }
    }, [effectiveJobId, initialJobTitle, searchParams]);

    // Fetch submitted proposals for this listing from backend
    useEffect(() => {
        if (!effectiveJobId) return;

        let isMounted = true;

        getSubmittedProposals(effectiveJobId)
            .then((data) => {
                if (isMounted) {
                    setProposals(Array.isArray(data) ? data : []);
                    setError(null);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    console.error('Failed to load proposals:', err);
                    setError(describeError(err));
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [effectiveJobId]);

    // Derive validation state dynamically during render
    const missingIdError = !effectiveJobId
        ? 'Please specify a valid jobPostingId in the URL, e.g. /proposal/view?jobPostingId=1'
        : null;

    const activeError = missingIdError || error;
    const activeIsLoading = effectiveJobId ? isLoading : false;

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

    const ITEMS_PER_PAGE = 5;
    const [currentPage, setCurrentPage] = useState(1);

    // safePage clamps currentPage to valid range if totalPages shrinks
    const totalPages = Math.max(
        1,
        Math.ceil(activeList.length / ITEMS_PER_PAGE),
    );
    const safePage = Math.min(currentPage, totalPages);
    const pagedList = activeList.slice(
        (safePage - 1) * ITEMS_PER_PAGE,
        safePage * ITEMS_PER_PAGE,
    );

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
                                    <ProposalCard
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
                                <ProposalDetail
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

export default function ProposalPage(props: {
    jobPostingId?: number;
    listingTitle?: string;
}) {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#FFFDF9] font-sans p-6 flex flex-col items-center">
                    <div className="w-full max-w-6xl py-20 text-center text-slate-500 text-sm">
                        Loading proposals...
                    </div>
                </div>
            }
        >
            <ProposalPageInner
                initialJobPostingId={props.jobPostingId}
                initialJobTitle={props.listingTitle}
            />
        </Suspense>
    );
}
