'use client';

import { useEffect, useRef, useState } from 'react';

import type { JobPosting, JobPostingListResponse } from '@mangodb/shared';

import JobBox from '@/components/job/JobBox';
import JobDetailPanel from '@/components/job/JobDetailPanel';
import Button from '@/components/ui/Button';

import { describeError } from '@/lib/api';

import {
    getAllJobPostings,
    getJobPostingDetail,
    getMyJobPostings,
} from '@/lib/job';

const PAGE_SIZE = 6;

type JobStatus = '' | 'OPEN' | 'CLOSED';

type JobPostingsPageProps =
    | {
          view: 'mine';
      }
    | {
          view: 'company';
          companyId: number;
      };

export default function JobPostingsPage(props: JobPostingsPageProps) {
    const companyId = props.view === 'company' ? props.companyId : undefined;
    const isMyJobs = props.view === 'mine';

    /*
     * ============================================================
     * Job list state
     * ============================================================
     */

    const [page, setPage] = useState(1);

    const [status, setStatus] = useState<JobStatus>('');

    const [result, setResult] = useState<JobPostingListResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [reloadKey, setReloadKey] = useState(0);

    /*
     * ============================================================
     * Add Job modal
     * ============================================================
     */

    const [isAddOpen, setIsAddOpen] = useState(false);

    /*
     * ============================================================
     * Job detail state
     *
     * Used for Other Jobs / Company Jobs.
     *
     * JobBox sends the jobPostingId here.
     * This page fetches the complete job detail.
     * ============================================================
     */

    const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

    const [isDetailLoading, setIsDetailLoading] = useState(false);

    const [detailError, setDetailError] = useState<string | null>(null);

    /*
     * ============================================================
     * List scroll reference
     * ============================================================
     */

    const listRef = useRef<HTMLDivElement>(null);

    /*
     * ============================================================
     * Load job postings
     * ============================================================
     */

    useEffect(() => {
        let cancelled = false;

        const request =
            props.view === 'mine'
                ? getMyJobPostings(
                      page,
                      PAGE_SIZE,
                      status
                          ? {
                                status,
                            }
                          : undefined,
                  )
                : getAllJobPostings(page, PAGE_SIZE, {
                      companyId: props.companyId,
                      status: 'OPEN',
                  });

        request
            .then((data) => {
                if (cancelled) return;
                setResult(data);
                setError(null);
            })
            .catch((requestError: unknown) => {
                if (cancelled) return;
                setError(describeError(requestError));
            })
            .finally(() => {
                if (cancelled) return;
                setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [page, status, reloadKey, props.view, companyId]);

    /*
     * ============================================================
     * Open Other Job detail
     *
     * OwnJobBox calls this with:
     *
     * onViewDetail(job.jobPostingId)
     *
     * ============================================================
     */

    const openCompanyJobDetail = async (jobPostingId: number) => {
        setSelectedJob(null);
        setDetailError(null);
        setIsDetailLoading(true);

        try {
            const detail = await getJobPostingDetail(jobPostingId);

            setSelectedJob(detail);
        } catch (requestError: unknown) {
            setDetailError(describeError(requestError));
        } finally {
            setIsDetailLoading(false);
        }
    };

    /*
     * ============================================================
     * Close detail panel
     * ============================================================
     */

    const closeDetailPanel = () => {
        setSelectedJob(null);
        setDetailError(null);
        setIsDetailLoading(false);
    };

    /*
     * ============================================================
     * Change page
     * ============================================================
     */

    const changePage = (nextPage: number) => {
        setPage(nextPage);

        listRef.current?.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    /*
     * ============================================================
     * Retry loading job list
     * ============================================================
     */

    const retryList = () => {
        setReloadKey((key) => key + 1);
    };

    /*
     * ============================================================
     * Pagination
     * ============================================================
     */

    const pagination = result?.pagination;

    const hasPreviousPage = page > 1;

    const hasNextPage = Boolean(pagination && page < pagination.totalPages);

    /*
     * ============================================================
     * Render
     * ============================================================
     */

    return (
        <main
            className="
                min-h-screen
                bg-surface
                px-[1.67vw]
                py-[2.96vh]
            "
        >
            <div
                className={`
                    flex
                    w-fit
                    flex-col
                    gap-[2.595vh]
                    transition-transform
                    duration-300
                    ease-in-out
                    ${selectedJob ? 'translate-x-[-8vw]' : 'translate-x-0'}
                    ${selectedJob ? '' : 'mx-auto'}
                `}
            >
                {/* =====================================================
                    PAGE TITLE
                    ===================================================== */}

                <div className="flex flex-col gap-[1.3vh]">
                    <span className="type-lg">
                        {isMyJobs ? 'My Jobs' : 'Jobs'}
                    </span>

                    <hr
                        className="
                            w-[56.56vw]
                            border-0
                            border-t
                            border-[#497B93]/50
                        "
                    />
                </div>

                {/* =====================================================
                    MY JOBS FILTERS + ADD JOB
                    ===================================================== */}

                {isMyJobs && (
                    <div
                        className="
                            flex
                            w-[56.56vw]
                            items-center
                            justify-between
                        "
                    >
                        {/* Status filters */}
                        <div
                            className="
                                mb-[2.22vh]
                                flex
                                items-center
                                gap-[0.63vw]
                            "
                        >
                            {[
                                {
                                    label: 'ALL',
                                    value: '',
                                    activeClass: 'bg-[#FEC84A] text-white',
                                },
                                {
                                    label: 'OPEN',
                                    value: 'OPEN',
                                    activeClass: 'bg-[#497B93] text-white',
                                },
                                {
                                    label: 'CLOSED',
                                    value: 'CLOSED',
                                    activeClass: 'bg-[#C5483B] text-white',
                                },
                            ].map((filter) => {
                                const isActive = status === filter.value;

                                return (
                                    <button
                                        key={filter.label}
                                        type="button"
                                        onClick={() => {
                                            setStatus(
                                                filter.value as JobStatus,
                                            );

                                            setPage(1);

                                            /*
                                             * Close any
                                             * currently
                                             * opened detail
                                             * when changing
                                             * filters.
                                             */
                                            closeDetailPanel();
                                        }}
                                        className={`
                                                flex
                                                h-[4.17vh]
                                                w-[6.77vw]
                                                items-center
                                                justify-center
                                                rounded-full
                                                border
                                                type-md
                                                font-medium
                                                transition-colors
                                                ${
                                                    isActive
                                                        ? `
                                                            ${filter.activeClass}
                                                            border-transparent
                                                            shadow-[inset_0_2px_4px_rgba(0,0,0,0.18),0_3px_6px_rgba(0,0,0,0.18)]
                                                        `
                                                        : `
                                                            border-line
                                                            bg-white
                                                            text-ink
                                                            shadow-[inset_0_2px_4px_rgba(0,0,0,0.08),0_2px_5px_rgba(0,0,0,0.12)]
                                                            hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_3px_7px_rgba(0,0,0,0.16)]
                                                        `
                                                }
                                            `}
                                    >
                                        {filter.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Add Job */}
                        <button
                            type="button"
                            onClick={() => setIsAddOpen(true)}
                            className="
                                flex
                                h-[4.17vh]
                                w-[8.96vw]
                                items-center
                                justify-center
                                rounded-full
                                bg-brand
                                type-md
                                text-surface
                                transition-colors
                                hover:bg-brand-dark
                            "
                        >
                            + Add Job
                        </button>
                    </div>
                )}

                {/* =====================================================
                    LIST + DETAIL PANEL
                    ===================================================== */}

                <div
                    className="
                        flex
                        items-start
                        gap-[1.5vw]
                    "
                >
                    {/* =================================================
                        JOB LIST
                        ================================================= */}

                    <div
                        ref={listRef}
                        className="
                            modal-scrollbar
                            h-[72.63vh]
                            w-[56.56vw]
                            overflow-y-auto
                            pr-[0.63vw]
                        "
                    >
                        {/* =============================================
                            LIST ERROR
                            ============================================= */}

                        {error && (
                            <div
                                role="alert"
                                className="
                                    rounded-button
                                    border
                                    border-danger/30
                                    bg-danger/5
                                    px-[1.25vw]
                                    py-[1.48vh]
                                    type-sm
                                    text-danger
                                "
                            >
                                <p>{error}</p>

                                <Button
                                    variant="outline"
                                    onClick={retryList}
                                    className="
                                        mt-[1.11vh]
                                        h-[4.07vh]
                                        px-[1.04vw]
                                        type-sm
                                    "
                                >
                                    Try again
                                </Button>
                            </div>
                        )}

                        {/* =============================================
                            LIST LOADING
                            ============================================= */}

                        {!error && isLoading && (
                            <div
                                className="
                                        flex
                                        flex-col
                                        gap-[3.87vh]
                                        pt-[1vh]
                                        pl-[0.5vw]
                                    "
                                aria-label="
                                        Loading job postings
                                    "
                            >
                                {Array.from({
                                    length: 6,
                                }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="
                                                    flex
                                                    h-[19.9vh]
                                                    w-[54.69vw]
                                                    animate-pulse
                                                    flex-col
                                                    gap-[2.22vh]
                                                    rounded-[30px]
                                                    bg-line
                                                    pt-[2.87vh]
                                                    pr-[2.29vw]
                                                    pl-[2.29vw]
                                                "
                                    />
                                ))}
                            </div>
                        )}

                        {/* =============================================
                            JOB LIST
                            ============================================= */}

                        {!error &&
                            !isLoading &&
                            result &&
                            result.items.length > 0 && (
                                <>
                                    <div
                                        className="
                                            flex
                                            flex-col
                                            gap-[3.87vh]
                                            pt-[1vh]
                                        "
                                    >
                                        {result.items.map((job) => (
                                            <JobBox
                                                key={job.jobPostingId}
                                                job={job}
                                                isMyJobs={isMyJobs}
                                                callFromSearchPage={false}
                                                onViewDetail={
                                                    openCompanyJobDetail
                                                }
                                            />
                                        ))}
                                    </div>

                                    {/* =================================
                                        PAGINATION
                                        ================================= */}

                                    {pagination &&
                                        pagination.totalItems > 0 && (
                                            <nav
                                                aria-label="
                                                    Job posting pages
                                                "
                                                className="
                                                    mt-[2.22vh]
                                                    flex
                                                    items-center
                                                    justify-between
                                                    gap-[1.04vw]
                                                    px-[0.5vw]
                                                "
                                            >
                                                {/* Previous */}
                                                <button
                                                    type="button"
                                                    disabled={!hasPreviousPage}
                                                    onClick={() =>
                                                        changePage(page - 1)
                                                    }
                                                    className="
                                                        rounded-full
                                                        border
                                                        border-[#497B93]
                                                        px-[1vw]
                                                        py-[0.7vh]
                                                        type-sm
                                                        text-[#497B93]
                                                        disabled:cursor-not-allowed
                                                        disabled:opacity-40
                                                    "
                                                >
                                                    Previous
                                                </button>

                                                {/* Page number */}
                                                <span className="type-sm text-ink">
                                                    Page {pagination.page} of{' '}
                                                    {pagination.totalPages}
                                                </span>

                                                {/* Next */}
                                                <button
                                                    type="button"
                                                    disabled={!hasNextPage}
                                                    onClick={() =>
                                                        changePage(page + 1)
                                                    }
                                                    className="
                                                        rounded-full
                                                        border
                                                        border-[#497B93]
                                                        px-[1vw]
                                                        py-[0.7vh]
                                                        type-sm
                                                        text-[#497B93]
                                                        disabled:cursor-not-allowed
                                                        disabled:opacity-40
                                                    "
                                                >
                                                    Next
                                                </button>
                                            </nav>
                                        )}
                                </>
                            )}

                        {/* =============================================
                            EMPTY STATE
                            ============================================= */}

                        {!error &&
                            !isLoading &&
                            result &&
                            result.items.length === 0 && (
                                <div
                                    className="
                                        flex
                                        min-h-[20vh]
                                        items-center
                                        justify-center
                                    "
                                >
                                    <p className="type-md text-ink-soft">
                                        No job postings found.
                                    </p>
                                </div>
                            )}
                    </div>

                    {!isMyJobs && selectedJob && (
                        <JobDetailPanel
                            job={selectedJob}
                            isLoading={isDetailLoading}
                            error={detailError}
                            onClose={closeDetailPanel}
                        />
                    )}
                </div>
            </div>

            {/* =========================================================
                ADD JOB MODAL

                Keep your existing Add Job modal implementation here.
                ========================================================= */}

            {isAddOpen && (
                <>
                    {/*
                     * Your existing Add Job modal goes here.
                     *
                     * Example:
                     *
                     * <AddJobModal
                     *     onClose={() =>
                     *         setIsAddOpen(false)
                     *     }
                     *     onSuccess={() => {
                     *         setIsAddOpen(false);
                     *         retryList();
                     *     }}
                     * />
                     */}
                </>
            )}
        </main>
    );
}
