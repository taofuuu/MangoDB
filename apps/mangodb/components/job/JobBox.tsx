'use client';

import type { JobPosting } from '@mangodb/shared';

import {
    MoreHorizontal,
    ArrowRight,
    CalendarClock,
    Edit,
    FileX,
    MapPin,
    Wallet,
    Tag,
} from 'lucide-react';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { formatBudgetRange } from '@/lib/money';

import JobDetailModal from './JobDetailModal';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';
import { describeError } from '@/lib/api';
import { closeJobPosting } from '@/lib/jobPostings';

interface JobBoxProps {
    job: JobPosting;
    isMyJobs: boolean;
    callFromSearchPage: boolean;
    onViewDetail: (job: JobPosting) => void;
    // Called after the job is closed, so the list can reload.
    onClosed?: () => void;
}

export default function JobBox({
    job,
    isMyJobs,
    callFromSearchPage,
    onViewDetail,
    onClosed,
}: JobBoxProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

    // US2-14. A thrown error becomes the modal's message.
    const confirmClose = async () => {
        try {
            await closeJobPosting(job.jobPostingId);
        } catch (err) {
            throw new Error(
                describeError(err, {
                    409: 'This job posting is already closed.',
                }),
            );
        }
        onClosed?.();
    };

    /*
     * These are only needed for My Jobs.
     * Other Jobs detail is controlled by the parent page.
     */
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const openDetail = async () => {
        setIsMenuOpen(false);
        setIsDetailOpen(true);
    };

    const closeDetail = () => {
        setIsDetailOpen(false);
    };

    const router = useRouter();

    return (
        <>
            <div
                className={`
                    relative
                    flex
                    min-h-[19.9vh]
                    max-w-[54.69vw]
                    flex-col
                    gap-[2.22vh]
                    rounded-[30px]
                    bg-white
                    pb-[2.314vh]
                    pt-[2.314vh]
                    pl-[2.29vw]
                    pr-[2.29vw]
                    text-left
                    transition
                    leading-relaxed

                    ${
                        isMyJobs
                            ? job.listingStatus === 'OPEN'
                                ? 'shadow-[0_0_12px_color-mix(in_srgb,var(--color-brand)_40%,transparent)]'
                                : job.listingStatus === 'CLOSED'
                                  ? 'shadow-[0_0_12px_color-mix(in_srgb,var(--color-danger)_40%,transparent)]'
                                  : 'shadow-sm'
                            : 'shadow-sm'
                    }
                `}
            >
                {/* Title + More button */}
                <div className="flex w-full items-center justify-between">
                    <h2 className="truncate type-md text-ink">
                        {job.listingTitle}
                    </h2>

                    {/* More menu - only for My Jobs, and only while OPEN:
                        Edit and Close are its only actions. There is no
                        Delete yet — no story and no DELETE endpoint. */}
                    {isMyJobs && job.listingStatus === 'OPEN' && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsMenuOpen((prev) => !prev)}
                                aria-label="Job actions"
                                aria-expanded={isMenuOpen}
                                className="rounded-full p-2 transition hover:bg-fill-subtle"
                            >
                                <MoreHorizontal size={24} />
                            </button>

                            {isMenuOpen && (
                                <div
                                    className="
                                        absolute
                                        right-0
                                        top-full
                                        z-50
                                        mt-2
                                        w-[10vw]
                                        rounded-lg
                                        bg-surface-white
                                        p-2
                                        shadow-lg
                                    "
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            router.push(
                                                `/job-postings/${job.jobPostingId}/edit`,
                                            );
                                        }}
                                        className="flex w-full items-center gap-[0.5vw] rounded-md px-3 py-2 text-left hover:bg-fill-subtle"
                                    >
                                        <Edit size={15} />
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setIsCloseModalOpen(true);
                                        }}
                                        className="flex w-full items-center gap-[0.5vw] rounded-md px-3 py-2 text-left hover:bg-fill-subtle"
                                    >
                                        <FileX size={15} />
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Categories */}
                <div className="flex w-full items-start justify-between bg-transparent">
                    <div className="flex items-center gap-[0.52vw]">
                        <Tag size={20} />

                        <div className="flex min-h-[2.22vh] flex-wrap gap-[0.42vw]">
                            {job.categories && job.categories.length > 0 ? (
                                job.categories.map((category) => (
                                    <span
                                        key={category}
                                        className="rounded-status bg-accent-tint px-[0.63vw] py-[0.19vh] type-sm !font-[600] text-ink"
                                    >
                                        {category}
                                    </span>
                                ))
                            ) : (
                                <span className="rounded-status bg-fill-subtle px-[0.63vw] py-[0.19vh] type-sm !font-[600]">
                                    General
                                </span>
                            )}
                        </div>
                    </div>

                    {callFromSearchPage && (
                        <p className="flex items-center gap-[0.52vw] line-clamp-4 type-sm leading-relaxed">
                            {job.companyName}
                        </p>
                    )}
                </div>

                {/* Budget + Location + Deadline + View Detail */}
                <div className="flex w-full items-center justify-between">
                    <p className="flex items-center gap-[0.52vw] line-clamp-4 type-sm leading-relaxed">
                        <Wallet size={20} />
                        {formatBudgetRange(job.minBudget, job.maxBudget)}
                    </p>

                    <p className="flex items-center gap-[0.52vw] line-clamp-4 type-sm leading-relaxed">
                        <MapPin size={20} />
                        {job.locationPref || 'No location provided.'}
                    </p>

                    <p className="flex items-center gap-[0.52vw] line-clamp-4 type-sm leading-relaxed">
                        <CalendarClock size={22} aria-hidden="true" />
                        {job.deadline || 'No job deadline provided.'}
                    </p>

                    <button
                        type="button"
                        onClick={() => {
                            if (isMyJobs) {
                                /*
                                 * My Jobs:
                                 * fetch detail inside JobBox
                                 */
                                openDetail();
                            } else {
                                /*
                                 * Other Jobs:
                                 * tell the parent which job was clicked.
                                 */
                                onViewDetail(job);
                            }
                        }}
                        className="
                            flex
                            h-[4.07vh]
                            w-[8.125vw]
                            items-center
                            justify-center
                            gap-[0.5vw]
                            rounded-[15px]
                            border
                            border-brand
                            type-sm
                            text-brand
                            hover:bg-brand/10
                        "
                    >
                        View Detail
                        <ArrowRight size={15} />
                    </button>
                </div>
            </div>

            {isMyJobs && (
                <JobDetailModal
                    job={job}
                    isOpen={isDetailOpen}
                    onClose={closeDetail}
                />
            )}
            <DeleteConfirmationModal
                isOpen={isCloseModalOpen}
                onClose={() => setIsCloseModalOpen(false)}
                onConfirm={confirmClose}
                title="Close Job Posting"
                description="It stops receiving proposals, and its pending proposals are rejected. A closed job posting cannot be reopened."
                confirmLabel="Yes, Close"
                pendingLabel="Closing..."
            />
        </>
    );
}
