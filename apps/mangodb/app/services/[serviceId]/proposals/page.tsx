'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ReceivedProposal } from '@mangodb/shared';
import {
    listServiceProposals,
    acceptProposal,
    rejectProposal,
} from '@/lib/proposals';
import { getService } from '@/lib/services';
import { RECEIVED_PROPOSAL_PAGE_SIZE } from '@/lib/pagination';
import EmptyState from '@/components/ui/EmptyState';
import StatusTabs from '@/components/ui/StatusTabs';
import ReceivedProposalCard from '@/components/proposals/ReceivedProposalCard';
import ReceivedProposalDetail from '@/components/proposals/ReceivedProposalDetail';
import {
    NOT_SIGNED_IN,
    describeError,
    isNotSignedIn,
    parseId,
} from '@/lib/api';
import { redirectToUnauthorized } from '@/lib/session';

const NOT_FOUND = 'This service could not be found.';

// The list shows the proposals filtered by status.
type ViewMode = 'pending' | 'accepted' | 'rejected' | null;

// US2-16. The proposals sent to one of your services, opened from the service.
export default function ServiceProposalsPage() {
    const serviceId = parseId(useParams().serviceId);

    const [listingTitle, setListingTitle] = useState('Service Proposals');
    const [proposals, setProposals] = useState<ReceivedProposal[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('pending');
    const [isLoading, setIsLoading] = useState(serviceId !== null);
    const [error, setError] = useState<string | null>(null);

    // The service gives the heading, and the list is its proposals. Only the
    // service's owner may read them; anyone else gets the API's 403 message.
    useEffect(() => {
        if (serviceId === null) return;

        let isMounted = true;

        Promise.all([getService(serviceId), listServiceProposals(serviceId)])
            .then(([service, data]) => {
                if (!isMounted) return;
                setListingTitle(service.listingTitle);
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
    }, [serviceId]);

    const activeError = serviceId === null ? NOT_FOUND : error;
    const activeIsLoading = serviceId !== null && isLoading;

    const totalCount = proposals.length;
    const pendingCount = proposals.filter(
        (p) => p.proposalStatus === 'PENDING',
    ).length;
    const acceptedCount = proposals.filter(
        (p) => p.proposalStatus === 'ACCEPTED',
    ).length;
    const rejectedCount = proposals.filter(
        (p) => p.proposalStatus === 'REJECTED',
    ).length;

    // Filter list based on active tab/view
    const activeList = proposals.filter((p) => {
        if (viewMode === 'pending') return p.proposalStatus === 'PENDING';
        if (viewMode === 'accepted') return p.proposalStatus === 'ACCEPTED';
        if (viewMode === 'rejected') return p.proposalStatus === 'REJECTED';
        return true;
    });

    const selectedProposal = proposals.find((p) => p.proposalId === selectedId);

    // Rethrown as a message, so the confirmation dialog shows it.
    const handleReject = async (proposalId: number) => {
        try {
            await rejectProposal(proposalId);
        } catch (err) {
            throw new Error(describeError(err));
        }

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
    };

    // A service stays open and can have multiple hires (ADR 0016), so accepting
    // a proposal marks only this proposal as ACCEPTED while other proposals remain untouched.
    // Returns created project for the accept modal.
    const handleAccept = async (proposalId: number) => {
        let createdProject;
        try {
            createdProject = await acceptProposal(proposalId);
        } catch (err) {
            throw new Error(describeError(err));
        }

        setProposals((prev) =>
            prev.map((p) =>
                p.proposalId === proposalId
                    ? { ...p, proposalStatus: 'ACCEPTED' }
                    : p,
            ),
        );

        return createdProject;
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
        <div className="min-h-screen bg-surface font-sans p-6 flex flex-col items-center">
            <div className="w-full max-w-6xl">
                {/* Main Header Title */}
                <div className="mb-6">
                    <h1 className="type-lg !font-[700] text-ink">
                        {viewMode === 'rejected'
                            ? 'Rejected Proposals'
                            : viewMode === 'accepted'
                              ? 'Accepted Proposals'
                              : 'Pending Proposals'}
                    </h1>
                    <h2 className="type-md !font-[600] text-ink mt-0.5">
                        {listingTitle}
                    </h2>
                    <div className="h-px bg-fill-muted mt-3 w-full" />
                </div>

                {/* Stats & View Switchers */}
                <div className="mb-6 flex flex-col gap-2">
                    <StatusTabs<ViewMode>
                        tabs={[
                            {
                                label: 'Pending',
                                value: 'pending',
                                count: pendingCount,
                            },
                            {
                                label: 'Accepted',
                                value: 'accepted',
                                count: acceptedCount,
                            },
                            {
                                label: 'Rejected',
                                value: 'rejected',
                                count: rejectedCount,
                            },
                            {
                                label: 'Total',
                                // Total is non-clickable and moved to the right side
                                value: null,
                                count: totalCount,
                                className: 'ml-auto',
                            },
                        ]}
                        value={viewMode}
                        onChange={(mode) => {
                            if (mode !== null) {
                                setViewMode(mode);
                                setSelectedId(null);
                                setCurrentPage(1);
                            }
                        }}
                        label="Filter proposals by status"
                    />
                </div>

                {/* Loading / Error / Empty States */}
                {activeIsLoading ? (
                    <div className="py-20 text-center text-ink-soft !font-[500] type-sm">
                        Loading proposals...
                    </div>
                ) : activeError ? (
                    <div className="py-20 text-center text-danger !font-[500] type-sm">
                        {activeError}
                    </div>
                ) : activeList.length === 0 ? (
                    <EmptyState
                        title={
                            viewMode === 'rejected'
                                ? 'No rejected proposals'
                                : viewMode === 'accepted'
                                  ? 'No accepted proposals'
                                  : 'No pending proposals'
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
                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-line">
                                    <span className="type-xs text-ink-soft">
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
                                            className="px-3 py-1 type-xs rounded-md border border-brand text-brand hover:bg-brand/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                                            className="px-3 py-1 type-xs rounded-md border border-brand text-brand hover:bg-brand/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                                    isService
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
