'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type {
    Paginated,
    ProposalStatus,
    ProposalStatusCounts,
    SentProposal,
} from '@mangodb/shared';
import { FileX2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import { describeError, isNotSignedIn } from '@/lib/api';
import { getMyProposalCounts, listMyProposals } from '@/lib/proposals';
import { PROPOSAL_PAGE_SIZE } from '@/lib/pagination';
import { redirectToUnauthorized } from '@/lib/session';
import MyProposalCard from './MyProposalCard';
import MyProposalDetail from './MyProposalDetail';

// The summary chips under the heading. Each one is also a filter: clicking
// Rejected shows only rejected proposals. `status: undefined` is Total.
const CHIPS: {
    label: string;
    status: ProposalStatus | undefined;
    count: keyof ProposalStatusCounts;
}[] = [
    { label: 'Total', status: undefined, count: 'total' },
    { label: 'Pending', status: 'PENDING', count: 'pending' },
    { label: 'Accepted', status: 'ACCEPTED', count: 'accepted' },
    { label: 'Rejected', status: 'REJECTED', count: 'rejected' },
];

function EmptyState() {
    return (
        <div className="flex flex-col items-center py-[10vh] text-center">
            <FileX2
                aria-hidden="true"
                strokeWidth={1.5}
                className="size-24 text-fill-muted"
            />
            <h2 className="mt-4 type-md text-ink">No Proposal Yet</h2>
            <p className="mt-1 type-xs text-ink-soft">
                Search for jobs to offer your proposal and it will show up here.
            </p>
            <Link
                href="/jobs"
                className="mt-4 rounded-button bg-brand px-6 py-2 type-xs text-surface-white hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
                Search for Jobs
            </Link>
        </div>
    );
}

export default function MyProposalsPage() {
    const [status, setStatus] = useState<ProposalStatus | undefined>();
    const [page, setPage] = useState(1);
    const [result, setResult] = useState<Paginated<SentProposal> | null>(null);
    const [counts, setCounts] = useState<ProposalStatusCounts | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [selected, setSelected] = useState<SentProposal | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setError(null);

        listMyProposals(page, PROPOSAL_PAGE_SIZE, { status })
            .then((data) => {
                if (cancelled) return;
                setResult(data);
                listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            })
            .catch((requestError: unknown) => {
                if (cancelled) return;

                if (isNotSignedIn(requestError)) {
                    redirectToUnauthorized();
                    return;
                }

                setError(
                    describeError(requestError, {
                        403: 'Only Provider accounts send proposals, so there is nothing to show here.',
                    }),
                );
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [page, status, reloadKey]);

    // The chip numbers ignore the filter, so they load once (and again on
    // Try again), not on every page or chip change. If they fail, the chips
    // show "–" and the list's own request reports the error.
    useEffect(() => {
        let cancelled = false;

        getMyProposalCounts()
            .then((data) => {
                if (!cancelled) setCounts(data);
            })
            .catch(() => {
                if (!cancelled) setCounts(null);
            });

        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    const changePage = useCallback((nextPage: number) => {
        setPage(nextPage);
        setSelected(null);
    }, []);

    const changeStatus = (nextStatus: ProposalStatus | undefined) => {
        setStatus(nextStatus);
        setPage(1);
        setSelected(null);
    };

    if (isLoading && !result && !error) {
        return (
            <main className="min-h-screen bg-surface p-6 text-ink">
                <p className="type-sm">Loading…</p>
            </main>
        );
    }

    const proposals = result?.items ?? [];
    const hasNone = counts?.total === 0;
    const activeChip = CHIPS.find((chip) => chip.status === status);

    return (
        <main className="min-h-screen bg-surface px-4 py-8 text-ink sm:px-[1.67vw]">
            <div
                className={`mx-auto flex flex-col gap-8 lg:flex-row lg:items-start ${
                    selected ? 'max-w-[93.75vw]' : 'max-w-[900px]'
                }`}
            >
                {/* With the detail open, the list becomes a narrow column
                    (about a third, as in the design) and the panel gets
                    the rest of the width. */}
                <div
                    className={`w-full min-w-0 ${
                        selected
                            ? 'lg:w-[30vw] lg:min-w-[340px] lg:shrink-0'
                            : 'lg:flex-1'
                    }`}
                >
                    <header className="border-b border-brand/50 pb-3">
                        <h1 className="type-hd text-ink">Your Proposals</h1>
                    </header>

                    <div
                        role="group"
                        aria-label="Filter proposals by status"
                        className="mt-4 flex flex-wrap gap-3"
                    >
                        {CHIPS.map((chip) => {
                            const isActive = chip.status === status;
                            return (
                                <button
                                    key={chip.label}
                                    type="button"
                                    onClick={() => changeStatus(chip.status)}
                                    aria-pressed={isActive}
                                    className={`flex overflow-hidden rounded-button border border-accent type-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                                        isActive
                                            ? 'ring-2 ring-brand ring-offset-1'
                                            : 'hover:brightness-95'
                                    }`}
                                >
                                    <span className="bg-accent px-3 py-1.5 text-ink">
                                        {chip.label}
                                    </span>
                                    <span className="min-w-9 bg-surface-white px-3 py-1.5 text-ink">
                                        {counts ? counts[chip.count] : '–'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="mt-6 rounded-button border border-danger/30 bg-danger-wash px-5 py-4 type-sm text-danger"
                        >
                            <p>{error}</p>
                            <Button
                                variant="outline"
                                onClick={() => setReloadKey((key) => key + 1)}
                                className="mt-3 min-h-[40px] px-4 type-sm"
                            >
                                Try again
                            </Button>
                        </div>
                    )}

                    {!error && hasNone && <EmptyState />}

                    {!error && !hasNone && (
                        <>
                            <div
                                ref={listRef}
                                aria-busy={isLoading}
                                className="mt-6 max-h-[62vh] overflow-y-auto px-1 py-1"
                            >
                                {isLoading ? (
                                    <div
                                        aria-label="Loading proposals"
                                        className="flex flex-col gap-4"
                                    >
                                        {Array.from({ length: 3 }).map(
                                            (_, index) => (
                                                <div
                                                    key={index}
                                                    className="h-20 animate-pulse rounded-button bg-fill-subtle"
                                                />
                                            ),
                                        )}
                                    </div>
                                ) : proposals.length > 0 ? (
                                    <ul className="flex flex-col gap-4">
                                        {proposals.map((proposal) => (
                                            <li key={proposal.proposalId}>
                                                <MyProposalCard
                                                    proposal={proposal}
                                                    isSelected={
                                                        selected?.proposalId ===
                                                        proposal.proposalId
                                                    }
                                                    isCompact={
                                                        selected !== null
                                                    }
                                                    onSelect={setSelected}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="py-[8vh] text-center type-sm text-ink-soft">
                                        No{' '}
                                        {activeChip?.label.toLowerCase() ?? ''}{' '}
                                        proposals.
                                    </p>
                                )}
                            </div>

                            <Pagination
                                pagination={result?.pagination}
                                onPageChange={changePage}
                                ariaLabel="Proposal pages"
                                isLoading={isLoading}
                            />
                        </>
                    )}
                </div>

                {selected && (
                    <MyProposalDetail
                        proposal={selected}
                        onClose={() => setSelected(null)}
                    />
                )}
            </div>
        </main>
    );
}
