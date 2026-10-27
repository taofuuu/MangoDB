'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import SearchBar from '@/components/ui/SearchBar';
import type { Job } from '@mangodb/shared';
import JobCard from '@/components/jobs/JobCard';
import JobDetailPanel from '@/components/jobs/JobDetailPanel';
import JobFilterSidebar from '@/components/jobs/JobFilterSidebar';
import PageGate from '@/components/auth/PageGate';
import { NOT_SIGNED_IN, describeError } from '@/lib/api';
import { JOB_PAGE_SIZE } from '@/lib/pagination';
import { useJobList } from '@/lib/useJobList';
import { useMyCompany } from '@/lib/useMyCompany';
import { getJobFilterOptions, type JobFilterOptions } from '@/lib/jobs';

type OrderType = 'DEFAULT' | 'BUDGET' | 'DEADLINE';
const ORDER_OPTIONS: { label: string; value: OrderType }[] = [
    { label: 'Default', value: 'DEFAULT' },
    { label: 'Budget', value: 'BUDGET' },
    { label: 'Deadline', value: 'DEADLINE' },
];

// Job search is a Provider's (US3-4). GET /jobs stays open to receivers too,
// because another company's profile lists its jobs through it.
export default function JobsPage() {
    const me = useMyCompany('provider');

    if (me.status !== 'ready') {
        return (
            <PageGate
                state={me}
                roleMessage="You need a Provider account to search job postings."
            />
        );
    }

    return <OtherJobPage />;
}

function OtherJobPage() {
    // q is the settled keyword, from SearchBar.
    const {
        jobs,
        pagination,
        hasLoaded,
        q,
        isLoading,
        error,
        filters,
        setFilters,
        clearFilters,
        search,
        goToPage,
        reload,
    } = useJobList({ view: 'search' });

    const [options, setOptions] = useState<JobFilterOptions>({
        categories: [],
    });
    const [optionsError, setOptionsError] = useState<string | null>(null);

    const [orderType, setOrderType] = useState<OrderType>('DEFAULT');
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let active = true;
        getJobFilterOptions()
            .then((data) => {
                if (active) setOptions(data);
            })
            .catch((err: unknown) => {
                if (active) setOptionsError(describeError(err));
            });
        return () => {
            active = false;
        };
    }, []);

    const openDetail = (job: Job) => {
        setSelectedJob(job);
        setIsDetailOpen(true);
    };

    const closeDetail = useCallback(() => {
        setIsDetailOpen(false);
        setSelectedJob(null);
    }, []);

    const scrollListToTop = () =>
        listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    const changePage = (nextPage: number) => {
        goToPage(nextPage);
        scrollListToTop();
    };

    const handleSearch = (keyword: string) => {
        search(keyword);
        scrollListToTop();
    };

    if (error === NOT_SIGNED_IN) {
        return <div className="min-h-screen bg-surface" />;
    }

    if (!hasLoaded && !error) {
        return <div className="min-h-screen bg-surface" />;
    }

    const hasActiveFilters =
        Boolean(q) ||
        filters.categories.length > 0 ||
        filters.minBudget !== null ||
        filters.maxBudget !== null ||
        (filters.deadlineType !== 'ANY' && Boolean(filters.deadlineDate));

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
                    <div ref={filterRef} className="shrink-0">
                        <JobFilterSidebar
                            filters={filters}
                            options={options}
                            optionsError={optionsError}
                            onChange={setFilters}
                            onClearAll={clearFilters}
                            className="w-[23.17vw] min-w-[240px] max-w-none"
                        />
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
                                        goToPage(1);
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
                                        onClick={reload}
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
                                    ) : jobs.length > 0 ? (
                                        <div className="flex flex-col gap-[3.87vh]">
                                            {jobs.map((job) => (
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
                                            {...(hasActiveFilters && {
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
