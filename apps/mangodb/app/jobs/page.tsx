'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import SearchBar from '@/components/ui/SearchBar';
import type { Job, Paginated } from '@mangodb/shared';
import JobCard from '@/components/jobs/JobCard';
import JobDetailPanel from '@/components/jobs/JobDetailPanel';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';
import { listJobs } from '@/lib/jobs';
import { JOB_PAGE_SIZE } from '@/lib/pagination';
import { redirectToUnauthorized } from '@/lib/session';

// The deadline and order boxes. Neither reaches GET /jobs yet (only the
// keyword and page do); the round-2 Phase 7 page records it for Sprint 3.
type DeadlineType = 'ANY' | 'BEFORE' | 'AFTER';
const DEADLINE_OPTIONS: { label: string; value: DeadlineType }[] = [
    { label: 'Any', value: 'ANY' },
    { label: 'Before', value: 'BEFORE' },
    { label: 'After', value: 'AFTER' },
];

type OrderType = 'DEFAULT' | 'BUDGET' | 'DEADLINE';
const ORDER_OPTIONS: { label: string; value: OrderType }[] = [
    { label: 'Default', value: 'DEFAULT' },
    { label: 'Budget', value: 'BUDGET' },
    { label: 'Deadline', value: 'DEADLINE' },
];

export default function OtherJobPage() {
    const [page, setPage] = useState(1);
    // The settled keyword, from SearchBar.
    const [search, setSearch] = useState('');
    //filter part (not currently used)
    const [categories, setCategories] = useState<string[]>([]);

    const [minBudget, setMinBudget] = useState('');
    const [maxBudget, setMaxBudget] = useState('');

    const [deadlineType, setDeadlineType] = useState<DeadlineType>('ANY');
    const [deadlineDate, setDeadlineDate] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [result, setResult] = useState<Paginated<Job> | null>(null);
    //
    const [orderType, setOrderType] = useState<OrderType>('DEFAULT');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isFilterOpen) return;

        function handleClickOutside(event: MouseEvent) {
            if (
                filterRef.current &&
                !filterRef.current.contains(event.target as Node)
            ) {
                setIsFilterOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsFilterOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isFilterOpen]);

    useEffect(() => {
        let cancelled = false;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setError(null);

        listJobs(page, JOB_PAGE_SIZE, {
            status: 'OPEN',
            q: search,
        })
            .then((data) => {
                if (cancelled) return;

                setResult(data);

                listRef.current?.scrollTo({
                    top: 0,
                    behavior: 'smooth',
                });
            })
            .catch((requestError: unknown) => {
                if (cancelled) return;
                if (isNotSignedIn(requestError)) {
                    setError(NOT_SIGNED_IN);
                    redirectToUnauthorized();
                    return;
                }
                setError(describeError(requestError));
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [page, reloadKey, search]);

    const openDetail = (job: Job) => {
        setSelectedJob(job);
        setIsDetailOpen(true);
    };

    const closeDetail = useCallback(() => {
        setIsDetailOpen(false);
        setSelectedJob(null);
    }, []);

    const changePage = (nextPage: number) => {
        setPage(nextPage);
    };

    const retryList = () => {
        setReloadKey((key) => key + 1);
    };

    const handleSearch = (q: string) => {
        setSearch(q);
        setPage(1);
    };

    const pagination = result?.pagination;
    const visibleJobs = result?.items ?? [];

    if (error === NOT_SIGNED_IN) {
        return <div className="min-h-screen bg-surface" />;
    }

    if (!result && !error) {
        return <div className="min-h-screen bg-surface" />;
    }

    return (
        // overflow-x-clip: the detail panel slides in from 2rem to the right,
        // which would otherwise make the page wider than the window for a
        // moment and let it scroll sideways.
        <main className="min-h-screen bg-surface flex overflow-x-clip py-[3vh] px-[2.67vw]">
            <div
                className={`
                    flex
                    items-start
                    transition-all
                    duration-300
                    ${
                        isDetailOpen
                            ? 'pl-[2vw] gap-[1.5vw]'
                            : 'pl-[6.5vw] gap-[2vw]'
                    }
                `}
            >
                {/* ================================================= */}
                {/* FILTER PANEL                                      */}
                {/* Only visible when detail is NOT open             */}
                {/* ================================================= */}

                {!isDetailOpen && (
                    <div
                        ref={filterRef}
                        className="relative h-[57.41vh] w-[23.17vw] rounded-popup bg-fill-subtle"
                    >
                        <div className="flex flex-col gap-[2.59vh] px-[1.09vw] py-[1.57vh]">
                            <h2 className="type-md text-ink">Filters</h2>

                            <hr className="w-[20.98vw] border-0 border-t border-brand/50" />

                            {/* Category */}
                            <div className="flex flex-col gap-[0.83vh]">
                                <div className="type-sm flex w-full items-start justify-between">
                                    Category
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCategories([]);
                                            setPage(1);
                                        }}
                                        className="hover:underline focus-visible:outline-none"
                                    >
                                        Clear
                                    </button>
                                </div>

                                <div className="h-[16vh] w-[20.94vw] rounded-[6px] border border-brand bg-surface-white" />
                            </div>

                            {/* Budget */}
                            <div className="flex flex-col gap-[0.83vh] type-sm">
                                <div className="flex w-full items-start justify-between">
                                    Budget
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMinBudget('');
                                            setMaxBudget('');
                                            setPage(1);
                                        }}
                                        className="hover:underline focus-visible:outline-none"
                                    >
                                        Clear
                                    </button>
                                </div>

                                <div className="flex w-full gap-[0.7vw]">
                                    <div className="flex gap-[0.4vw]">
                                        Min
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            min="0"
                                            value={minBudget}
                                            onChange={(e) => {
                                                setMinBudget(e.target.value);
                                                setPage(1);
                                            }}
                                            className="h-[3vh] w-[7.2vw] rounded-[6px] border border-brand bg-surface-white px-[0.5vw] text-center outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                                        />
                                    </div>
                                    -
                                    <div className="flex gap-[0.4vw]">
                                        Max
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            min="0"
                                            value={maxBudget}
                                            onChange={(e) => {
                                                setMaxBudget(e.target.value);
                                                setPage(1);
                                            }}
                                            className="h-[3vh] w-[7.2vw] rounded-[6px] border border-brand bg-surface-white px-[0.5vw] text-center outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Deadline */}
                            <div className="flex flex-col gap-[0.83vh] type-sm">
                                <div className="flex w-full items-start justify-between">
                                    Deadline
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDeadlineType('ANY');
                                            setDeadlineDate('');
                                            setPage(1);
                                        }}
                                        className="hover:underline focus-visible:outline-none"
                                    >
                                        Clear
                                    </button>
                                </div>

                                <div className="flex gap-[0.42vw]">
                                    <Dropdown
                                        value={deadlineType}
                                        options={DEADLINE_OPTIONS}
                                        onChange={(next) => {
                                            setDeadlineType(next);
                                            setPage(1);
                                        }}
                                        label="Deadline before or after"
                                        className="w-[6vw] min-w-[90px]"
                                    />

                                    <input
                                        type="date"
                                        value={deadlineDate}
                                        onChange={(e) => {
                                            setDeadlineDate(e.target.value);
                                            setPage(1);
                                        }}
                                        aria-label="Deadline date"
                                        className="h-[3.70vh] min-w-0 flex-1 rounded-[6px] border border-brand bg-surface-white px-[0.63vw] type-sm focus:ring-1 focus:ring-brand/30"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* ================= CONTENT ================= */}
                <div className="flex flex-col max-w-[93.75vw] gap-[2vh]">
                    {/* ================= HEADER ================= */}
                    <div
                        className={`
                    flex
                    flex-col
                    gap-[1vw]
                    transition-all
                    duration-300
                    justify-center
                    ${isDetailOpen ? ' w-[91vw]' : 'w-[56.56vw]'}
                        `}
                    >
                        <div className="flex items-baseline gap-[1vw]">
                            <h2 className="type-lg">All Jobs</h2>

                            <div className="type-sm text-ink-placeholder">
                                (Search result: {pagination?.totalItems ?? 0}{' '}
                                items)
                            </div>
                        </div>

                        <hr
                            className={`
                        border-0
                        border-t
                        border-brand/50
                        ${isDetailOpen ? 'w-[91vw]' : 'w-[56.56vw]'}
                    `}
                        />

                        {/* Search + Order */}
                        <div className="flex w-full items-center">
                            {/* Search */}
                            <SearchBar
                                onSearch={handleSearch}
                                label="Search jobs by keyword"
                                className="w-[27.86vw]"
                            />

                            {/* Order by */}
                            <div className="ml-auto flex items-center gap-[1vw] type-sm">
                                <span className="text-ink-placeholder">
                                    Order by:
                                </span>

                                <Dropdown
                                    value={orderType}
                                    options={ORDER_OPTIONS}
                                    onChange={(next) => {
                                        setOrderType(next);
                                        setPage(1);
                                    }}
                                    label="Order jobs by"
                                    className="w-[8.125vw] min-w-[120px]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ================================================= */}
                    {/* JOB LIST                                          */}
                    {/* ================================================= */}
                    <div className="flex gap-[1.5vw] pr-[2vw]">
                        <div
                            className={`
                        flex
                        h-[72.63vh]
                        flex-col
                        transition-all
                        duration-300
                        ${isDetailOpen ? 'w-[56.56vw]' : 'w-[56.56vw]'}
                    `}
                        >
                            {error && error !== NOT_SIGNED_IN && (
                                <div
                                    role="alert"
                                    className="rounded-button border border-danger/30 bg-danger/5 px-[1.25vw] py-[1.48vh] type-sm text-danger"
                                >
                                    <p>{error}</p>

                                    <Button
                                        variant="outline"
                                        onClick={retryList}
                                        className="mt-[1.11vh] h-[4.07vh] px-[1.04vw] type-sm"
                                    >
                                        Try again
                                    </Button>
                                </div>
                            )}

                            {!error && (
                                <div
                                    ref={listRef}
                                    className="min-h-0 flex-1 overflow-y-auto pr-[0.63vw]"
                                >
                                    {isLoading ? (
                                        <div
                                            className="flex flex-col gap-[3.87vh]"
                                            aria-label="Loading jobs"
                                        >
                                            {Array.from({
                                                length: JOB_PAGE_SIZE,
                                            }).map((_, index) => (
                                                <div
                                                    key={index}
                                                    className="flex h-[19.9vh] w-[54.69vw] flex-col gap-[2.22vh] rounded-popup bg-line pt-[2.87vh] pl-[2.29vw] pr-[2.29vw] animate-pulse"
                                                />
                                            ))}
                                        </div>
                                    ) : result && visibleJobs.length > 0 ? (
                                        <div className="flex flex-col gap-[3.87vh]">
                                            {visibleJobs.map((job) => (
                                                <JobCard
                                                    key={job.jobId}
                                                    job={job}
                                                    isMyJobs={false}
                                                    callFromSearchPage={true}
                                                    onViewDetail={openDetail}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState
                                            title="No job postings found"
                                            {...((search ||
                                                categories.length > 0 ||
                                                minBudget !== '' ||
                                                maxBudget !== '' ||
                                                deadlineDate) && {
                                                message:
                                                    'Try a broader keyword or fewer filters.',
                                            })}
                                        />
                                    )}
                                </div>
                            )}

                            <Pagination
                                pagination={error ? null : pagination}
                                onPageChange={changePage}
                                ariaLabel="Job posting pages"
                                isLoading={isLoading}
                            />
                        </div>
                        {/* ================================================= */}
                        {/* DETAIL PANEL                                      */}
                        {/* ================================================= */}
                        {isDetailOpen && selectedJob && (
                            <div className="h-[72.63vh] w-[35vw] shrink-0 motion-safe:animate-slide-in">
                                <JobDetailPanel
                                    job={selectedJob}
                                    onClose={closeDetail}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
