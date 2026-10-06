'use client';

import { useEffect, useRef, useState } from 'react';

import type { JobPosting, JobPostingListResponse } from '@mangodb/shared';

import JobBox from '@/components/job/JobBox';
import JobDetailPanel from '@/components/job/JobDetailPanel';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';

import { describeError, isNotSignedIn, NOT_SIGNED_IN } from '@/lib/api';

import Link from 'next/link';

import { getAllJobPostings, getMyJobPostings } from '@/lib/job';
import { JOB_PAGE_SIZE } from '@/lib/pagination';

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
     * JobBox sends the complete job here.
     * The list already contains all job posting fields.
     * ============================================================
     */

    const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

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

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setError(null);

        const request =
            props.view === 'mine'
                ? getMyJobPostings(
                      page,
                      JOB_PAGE_SIZE,
                      status
                          ? {
                                status,
                            }
                          : undefined,
                  )
                : getAllJobPostings(page, JOB_PAGE_SIZE, {
                      companyId: companyId!,
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

                if (isNotSignedIn(requestError)) {
                    setError(NOT_SIGNED_IN);
                    return;
                }

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
     * JobBox sends the complete job posting here.
     * No additional API request is needed.
     * ============================================================
     */

    const openCompanyJobDetail = (job: JobPosting) => {
        setSelectedJob(job);
    };

    /*
     * ============================================================
     * Close detail panel
     * ============================================================
     */

    const closeDetailPanel = () => {
        setSelectedJob(null);
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
                            border-brand/50
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
                                    activeClass: 'bg-accent text-surface-white',
                                },
                                {
                                    label: 'OPEN',
                                    value: 'OPEN',
                                    activeClass: 'bg-brand text-surface-white',
                                },
                                {
                                    label: 'CLOSED',
                                    value: 'CLOSED',
                                    activeClass: 'bg-danger text-surface-white',
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
                                                            bg-surface-white
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
                        className="
                            flex
                            h-[72.63vh]
                            w-[56.56vw]
                            flex-col
                        "
                    >
                        <div
                            ref={listRef}
                            className="min-h-0 flex-1 overflow-y-auto pr-[0.63vw]"
                        >
                            {/* =============================================
                            LIST ERROR
                            ============================================= */}
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
                                        length: JOB_PAGE_SIZE,
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
                                                    rounded-popup
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
                                    <div
                                        className="
                                            flex
                                            flex-col
                                            gap-[3.87vh]
                                            pt-[1vh]
                                            pl-[0.5vw]
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

                        <Pagination
                            pagination={error ? null : pagination}
                            onPageChange={changePage}
                            ariaLabel="Job posting pages"
                            isLoading={isLoading}
                            className="px-[0.5vw]"
                        />
                    </div>

                    {!isMyJobs && selectedJob && (
                        <JobDetailPanel
                            job={selectedJob}
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
