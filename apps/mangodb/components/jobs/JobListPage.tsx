'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

import type { Job } from '@mangodb/shared';

import JobCard from '@/components/jobs/JobCard';
import JobDetailPanel from '@/components/jobs/JobDetailPanel';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import UnauthorizedPage from '@/components/auth/UnauthorizedPage';

import { NOT_SIGNED_IN } from '@/lib/api';
import { useJobList, type JobStatusFilter } from '@/lib/useJobList';

import { FilePlus, CheckCircle2Icon } from 'lucide-react';

import { JOB_PAGE_SIZE } from '@/lib/pagination';
import { useRouter, useSearchParams } from 'next/navigation';
import ModalShell from '../ui/ModalShell';
import StatusTabs, { type StatusTab } from '../ui/StatusTabs';

// Each pill fills with its own colour when chosen, as the design draws it.
const STATUS_TABS: StatusTab<JobStatusFilter>[] = [
    { label: 'ALL', value: '', activeClass: 'bg-accent text-surface-white' },
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
    const isMyJobs = props.view === 'mine';
    const {
        jobs,
        pagination,
        hasLoaded,
        status,
        isLoading,
        error,
        isRestricted,
        changeStatus,
        goToPage,
        reload,
    } = useJobList(
        props.view === 'company'
            ? { view: 'company', companyId: props.companyId }
            : { view: 'mine' },
    );

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
        goToPage(nextPage);

        listRef.current?.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

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

    if (!hasLoaded && !error && !isRestricted) {
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
        // overflow-x-clip: the detail panel slides in from 2rem to the right,
        // which would otherwise widen the page for a moment.
        <main
            className="
                min-h-screen
                overflow-x-clip
                bg-surface
                px-[1.67vw]
                py-[2.96vh]
            "
        >
            {/* Centred while it is only the list. With a job open, list and
                panel start at the left edge, as on the search pages; it used
                to shift 8vw left as well, which pushed the cards off screen. */}
            <div
                className={`
                    flex
                    w-fit
                    flex-col
                    gap-[2.595vh]
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

                {isMyJobs && hasLoaded && !error && (
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
                                changeStatus(next);
                                // A detail open from the old filter may not
                                // be in the new one.
                                closeDetailPanel();
                            }}
                            label="Filter jobs by status"
                            variant="pills"
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
                                        onClick={reload}
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

                            {!error && !isLoading && jobs.length > 0 && (
                                <div
                                    className="
                                            flex
                                            flex-col
                                            gap-[3.87vh]
                                            pt-[1vh]
                                            pl-[0.5vw]
                                        "
                                >
                                    {jobs.map((job) => (
                                        <JobCard
                                            key={job.jobId}
                                            job={job}
                                            isMyJobs={isMyJobs}
                                            callFromSearchPage={false}
                                            onViewDetail={openCompanyJobDetail}
                                            onClosed={() => {
                                                reload();
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
                                hasLoaded &&
                                jobs.length === 0 && (
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
                        <div className="shrink-0 motion-safe:animate-slide-in">
                            <JobDetailPanel
                                job={selectedJob}
                                onClose={closeDetailPanel}
                            />
                        </div>
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
