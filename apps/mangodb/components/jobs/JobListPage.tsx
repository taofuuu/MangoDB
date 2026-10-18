'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import type { Job, ListingStatus, Paginated } from '@mangodb/shared';

import JobCard from '@/components/jobs/JobCard';
import JobDetailPanel from '@/components/jobs/JobDetailPanel';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import UnauthorizedPage from '@/components/auth/UnauthorizedPage';

import {
    describeError,
    isForbidden,
    isNotSignedIn,
    NOT_SIGNED_IN,
} from '@/lib/api';
import { redirectToUnauthorized } from '@/lib/session';

import { FilePlus, CheckCircle2Icon } from 'lucide-react';

import { listJobs, listMyJobs } from '@/lib/jobs';
import { JOB_PAGE_SIZE } from '@/lib/pagination';
import { useRouter, useSearchParams } from 'next/navigation';
import ModalShell from '../ui/ModalShell';
import StatusTabs, { type StatusTab } from '../ui/StatusTabs';

// '' is the All tab: no status filter.
type JobStatus = '' | ListingStatus;

const STATUS_TABS: StatusTab<JobStatus>[] = [
    { label: 'All', value: '' },
    { label: 'Open', value: 'OPEN' },
    { label: 'Closed', value: 'CLOSED' },
];

// backHref puts a ← before the title, back to the profile the list was
// opened from.
type JobListPageProps = { backHref: string } & (
    | {
          view: 'mine';
      }
    | {
          view: 'company';
          companyId: number;
      }
);

export default function JobListPage(props: JobListPageProps) {
    const companyId = props.view === 'company' ? props.companyId : undefined;
    const isMyJobs = props.view === 'mine';

    /*
     * ============================================================
     * Job list state
     * ============================================================
     */

    const [page, setPage] = useState(1);

    const [status, setStatus] = useState<JobStatus>('');

    const [result, setResult] = useState<Paginated<Job> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRestricted, setIsRestricted] = useState(false);

    const [reloadKey, setReloadKey] = useState(0);

    /*
     * ============================================================
     * Job detail state
     *
     * Used for Other Jobs / Company Jobs.
     *
     * JobCard sends the complete job here.
     * The list already contains all job posting fields.
     * ============================================================
     */

    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

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
                ? listMyJobs(
                      page,
                      JOB_PAGE_SIZE,
                      status
                          ? {
                                status,
                            }
                          : undefined,
                  )
                : listJobs(page, JOB_PAGE_SIZE, {
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
                    redirectToUnauthorized();
                    return;
                }

                if (isForbidden(requestError)) {
                    setIsRestricted(true);
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
     * JobCard sends the complete job posting here.
     * No additional API request is needed.
     * ============================================================
     */

    const isDetailPanelOpen = Boolean(selectedJob);
    const openCompanyJobDetail = (job: Job) => {
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
     * Show Add success popup
     * ============================================================
     */

    const router = useRouter();
    const searchParams = useSearchParams();

    const showPostSuccess = ['posted', 'updated', 'closed'].includes(
        searchParams.get('success') ?? '',
    );

    const closePostSuccess = () => {
        router.replace('/jobs/mine', { scroll: false });
    };

    /*
     * ============================================================
     * Render
     * ============================================================
     */

    if (!result && !error && !isRestricted) {
        return <div className="min-h-screen bg-surface" />;
    }

    if (isRestricted) {
        return (
            <UnauthorizedPage
                variant="danger"
                icon="shield"
                title="Access Restricted"
                badge="Insufficient permissions"
                message="You need a Receiver account to view and manage your job postings."
                showLogin={false}
            />
        );
    }

    if (error === NOT_SIGNED_IN) {
        return <div className="min-h-screen bg-surface" />;
    }

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

                <div
                    className={`
        flex
        flex-col
        gap-[1.3vh]
        transition-all
        duration-300
        ${isDetailPanelOpen ? 'ml-[2vw] w-[91vw]' : 'ml-0 w-[56.56vw]'}
    `}
                >
                    <span className="type-lg">
                        <Link
                            href={props.backHref}
                            aria-label="Back to the company profile"
                            className="pr-4"
                        >
                            ←
                        </Link>
                        {isMyJobs ? 'My Jobs' : 'Jobs'}
                    </span>

                    <hr
                        className="
            w-full
            shrink-0
            border-0
            border-t
            border-brand/50
            transition-all
            duration-300
        "
                    />
                </div>

                {/* =====================================================
                    MY JOBS FILTERS + ADD JOB
                    ===================================================== */}

                {isMyJobs && result !== null && !error && (
                    <div
                        className="
                            flex
                            w-[56.56vw]
                            items-center
                            justify-between
                        "
                    >
                        {/* Status filters */}
                        <StatusTabs
                            tabs={STATUS_TABS}
                            value={status}
                            onChange={(next) => {
                                setStatus(next);
                                setPage(1);
                                // A detail open from the old filter may not
                                // be in the new one.
                                closeDetailPanel();
                            }}
                            label="Filter jobs by status"
                        />

                        {/* Add Job */}
                        <Button
                            type="button"
                            onClick={() => router.push('/jobs/create')}
                            className="flex h-[4.17vh] w-[8.96vw] items-center justify-center gap-[0.42vw] "
                        >
                            <FilePlus size={18} aria-hidden="true" />
                            Add Job
                        </Button>
                    </div>
                )}

                {/* =====================================================
                    LIST + DETAIL PANEL
                    ===================================================== */}

                <div
                    className={`
                    mt-[2vh]
                    flex
                    items-start
                    transition-all
                    duration-300
                    ${isDetailPanelOpen ? 'ml-[2vw] gap-[1.5vw]' : ''}
                `}
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
                                            <JobCard
                                                key={job.jobId}
                                                job={job}
                                                isMyJobs={isMyJobs}
                                                callFromSearchPage={false}
                                                onViewDetail={
                                                    openCompanyJobDetail
                                                }
                                                onClosed={() => {
                                                    retryList();
                                                    router.replace(
                                                        '/jobs/mine?success=closed',
                                                        { scroll: false },
                                                    );
                                                }}
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

            <ModalShell
                isOpen={showPostSuccess}
                onClose={closePostSuccess}
                labelledBy="post-success-title"
                panelClassName="w-[33.33vw] h-[32vh] max-w-full rounded-popup bg-surface text-center px-[2vw]"
            >
                <div className="flex flex-col items-center gap-[2.5vh]">
                    <div className="mt-[5vh] flex w-full justify-center items-center gap-[1.4vw]">
                        <CheckCircle2Icon
                            size={90}
                            className="text-brand"
                            aria-hidden="true"
                        />
                        <h2
                            id="post-success-title"
                            className="type-md font-semibold text-ink"
                        >
                            {searchParams.get('success') === 'closed'
                                ? 'Job closed successfully!'
                                : searchParams.get('success') === 'updated'
                                  ? 'Job updated successfully!'
                                  : 'Job created successfully!'}
                        </h2>
                    </div>

                    <hr
                        className="
                            w-[29.53vw]
                            border-0
                            border-t
                            border-brand/50
                        "
                    />

                    <Button
                        type="button"
                        onClick={closePostSuccess}
                        className="h-[4.07vh] w-[9.16vw] self-end type-sm !font-[500]"
                    >
                        OK
                    </Button>
                </div>
            </ModalShell>
        </main>
    );
}
