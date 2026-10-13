'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import Link from 'next/link';
import type { JobPosting, JobPostingListResponse } from '@mangodb/shared';
import JobBox from '@/components/job/JobBox';
import JobDetailPanel from '@/components/job/JobDetailPanel';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';
import { getAllJobPostings } from '@/lib/job';
import { JOB_PAGE_SIZE } from '@/lib/pagination';

export default function OtherJobPage() {
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    //filter part (not currently used)
    const [categories, setCategories] = useState<string[]>([]);

    const [minBudget, setMinBudget] = useState('');
    const [maxBudget, setMaxBudget] = useState('');

    const [deadlineType, setDeadlineType] = useState<'BEFORE' | 'AFTER' | ''>(
        '',
    );
    const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
    const [deadlineDate, setDeadlineDate] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [result, setResult] = useState<JobPostingListResponse | null>(null);
    //
    const [orderType, setOrderType] = useState<'Budget' | 'Deadline' | ''>('');
    const [isOrderOpen, setIsOrderOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const nextSearch = searchQuery.trim();
        if (nextSearch === debouncedSearch) return;

        const timer = setTimeout(() => {
            setDebouncedSearch(nextSearch);
            setPage(1);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearch]);

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

        getAllJobPostings(page, JOB_PAGE_SIZE, {
            status: 'OPEN',
            q: debouncedSearch,
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
    }, [page, reloadKey, debouncedSearch]);

    const openDetail = (job: JobPosting) => {
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

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setDebouncedSearch('');
        setPage(1);
    };

    const pagination = result?.pagination;
    const visibleJobs = result?.items ?? [];

    return (
        <main className="min-h-screen bg-surface px-[1.67vw] py-[2.96vh]">
            <div className="mx-auto max-w-[93.75vw]">
                {/* ================= HEADER ================= */}
                <div
                    className={`
                    flex
                    flex-col
                    gap-[1vw]
                    transition-all
                    duration-300
                    justify-center
                    ${
                        isDetailOpen
                            ? 'ml-[2vw] w-[91vw]'
                            : 'ml-[32vw] w-[55.1vw]'
                    }
                `}
                >
                    <div className="flex items-baseline gap-[1vw]">
                        <h2 className="type-lg">All Jobs</h2>

                        <div className="type-sm text-ink-placeholder">
                            (Search result: {pagination?.totalItems ?? 0} items)
                        </div>
                    </div>

                    <hr
                        className={`
                        border-0
                        border-t
                        border-brand/50
                        ${isDetailOpen ? 'w-[91vw]' : 'w-[55.1vw]'}
                    `}
                    />

                    {/* Search + Order */}
                    <div className="flex w-full items-center">
                        {/* Search */}
                        <div className="relative h-[4.07vh] w-[27.86vw] min-w-[180px]">
                            <Search
                                aria-hidden="true"
                                className="pointer-events-none absolute left-[0.6vw] top-1/2 h-[2vh] w-[2vw] -translate-y-1/2 text-ink-placeholder"
                            />

                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) =>
                                    handleSearchChange(e.target.value)
                                }
                                maxLength={100}
                                placeholder="Search"
                                aria-label="Search jobs by keyword"
                                className="h-full w-full rounded-[50px] border border-line bg-surface-white pl-[3vw] pr-[3vw] type-sm text-ink placeholder:text-ink-placeholder focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                            />

                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    aria-label="Clear search"
                                    className="absolute right-[1vw] top-1/2 -translate-y-1/2 rounded-full p-[0.16vw] type-sm text-ink-placeholder hover:bg-line hover:text-ink focus-visible:outline-none"
                                >
                                    <X
                                        aria-hidden="true"
                                        className="h-[1.48vh] w-[0.73vw]"
                                    />
                                </button>
                            )}
                        </div>

                        {/* Order by */}
                        <div className="ml-auto flex items-center gap-[1vw] type-sm">
                            <span className="text-ink-placeholder">
                                Order by:
                            </span>

                            <div className="relative w-[8.125vw]">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsOrderOpen((open) => !open)
                                    }
                                    className="flex h-[4.07vh] w-full items-center justify-between rounded-[10px] border border-line bg-surface-white px-[0.7vw] type-sm hover:bg-fill-subtle"
                                >
                                    <span>{orderType || ''}</span>

                                    <ChevronDown
                                        className="h-[1.5vh] w-[1vw]"
                                        aria-hidden="true"
                                    />
                                </button>

                                {isOrderOpen && (
                                    <div className="absolute left-0 top-[calc(100%+0.4vh)] z-50 h-[12vh] w-full overflow-hidden rounded-[10px] border border-line bg-surface-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOrderType('');
                                                setPage(1);
                                                setIsOrderOpen(false);
                                            }}
                                            className="flex h-1/3 w-full items-center px-[0.7vw] text-left type-sm hover:bg-fill-subtle"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOrderType('Budget');
                                                setPage(1);
                                                setIsOrderOpen(false);
                                            }}
                                            className="flex h-1/3 w-full items-center px-[0.7vw] text-left type-sm hover:bg-fill-subtle"
                                        >
                                            Budget
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOrderType('Deadline');
                                                setPage(1);
                                                setIsOrderOpen(false);
                                            }}
                                            className="flex h-1/3 w-full items-center px-[0.7vw] text-left type-sm hover:bg-fill-subtle"
                                        >
                                            Deadline
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================= CONTENT ================= */}

                <div
                    className={`
                    mt-[2vh]
                    flex
                    items-start
                    transition-all
                    duration-300
                    ${
                        isDetailOpen
                            ? 'ml-[2vw] gap-[1.5vw]'
                            : 'pl-[6.5vw] gap-[3.87vh]'
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
                                                    setMinBudget(
                                                        e.target.value,
                                                    );
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
                                                    setMaxBudget(
                                                        e.target.value,
                                                    );
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
                                                setDeadlineType('');
                                                setDeadlineDate('');
                                                setPage(1);
                                            }}
                                            className="hover:underline focus-visible:outline-none"
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    <div className="flex gap-[0.42vw]">
                                        <div className="relative w-[6vw]">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setIsDeadlineOpen(
                                                        (open) => !open,
                                                    )
                                                }
                                                className="flex h-[3.70vh] w-full items-center justify-between rounded-[6px] border border-brand bg-surface-white px-[0.5vw] type-sm hover:bg-fill-subtle"
                                            >
                                                <span>
                                                    {deadlineType === 'BEFORE'
                                                        ? 'Before'
                                                        : deadlineType ===
                                                            'AFTER'
                                                          ? 'After'
                                                          : 'Any'}
                                                </span>

                                                <ChevronDown
                                                    className="h-[1.5vh] w-[1vw]"
                                                    aria-hidden="true"
                                                />
                                            </button>

                                            {isDeadlineOpen && (
                                                <div className="absolute left-0 top-[calc(100%+0.4vh)] z-50 w-full overflow-hidden rounded-[6px] border border-brand bg-surface-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                                                    {[
                                                        {
                                                            label: 'Any',
                                                            value: '',
                                                        },
                                                        {
                                                            label: 'Before',
                                                            value: 'BEFORE',
                                                        },
                                                        {
                                                            label: 'After',
                                                            value: 'AFTER',
                                                        },
                                                    ].map((option) => (
                                                        <button
                                                            key={option.label}
                                                            type="button"
                                                            onClick={() => {
                                                                setDeadlineType(
                                                                    option.value as
                                                                        | 'BEFORE'
                                                                        | 'AFTER'
                                                                        | '',
                                                                );
                                                                setPage(1);
                                                                setIsDeadlineOpen(
                                                                    false,
                                                                );
                                                            }}
                                                            className="w-full px-[0.5vw] py-[0.6vh] text-left type-sm hover:bg-fill-subtle"
                                                        >
                                                            {option.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

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

                    {/* ================================================= */}
                    {/* JOB LIST                                          */}
                    {/* ================================================= */}

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
                        {error === NOT_SIGNED_IN && (
                            <p className="type-md !font-[400]">
                                You are not signed in.{' '}
                                <Link href="/login" className="underline">
                                    Log in
                                </Link>
                                , then come back.
                            </p>
                        )}

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
                                            <JobBox
                                                key={job.jobPostingId}
                                                job={job}
                                                isMyJobs={false}
                                                callFromSearchPage={true}
                                                onViewDetail={openDetail}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="py-[9.26vh] text-center type-md text-ink-soft">
                                        {debouncedSearch ||
                                        categories.length > 0 ||
                                        minBudget !== '' ||
                                        maxBudget !== '' ||
                                        deadlineDate
                                            ? 'No job postings found matching your search or filter.'
                                            : 'No job postings found.'}
                                    </p>
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
                        <div className="h-[72.63vh] w-[35vw] shrink-0">
                            <JobDetailPanel
                                job={selectedJob}
                                onClose={closeDetail}
                            />
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
