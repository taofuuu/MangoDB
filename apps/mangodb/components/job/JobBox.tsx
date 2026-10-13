'use client';

import type { JobPosting } from '@mangodb/shared';

import {
    MoreHorizontal,
    ArrowRight,
    CalendarClock,
    Edit,
    FileX,
    Trash,
    MapPin,
    Wallet,
    Tag,
} from 'lucide-react';

import { useState } from 'react';

import JobDetailModal from './JobDetailModal';

interface JobBoxProps {
    job: JobPosting;
    isMyJobs: boolean;
    callFromSearchPage: boolean;
    onViewDetail: (job: JobPosting) => void;
}

export default function JobBox({
    job,
    isMyJobs,
    callFromSearchPage,
    onViewDetail,
}: JobBoxProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
                                ? 'shadow-[0_0_8px_rgba(73,123,147,0.35)]'
                                : job.listingStatus === 'CLOSED'
                                  ? 'shadow-[0_0_8px_rgba(197,72,59,0.35)]'
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

                    {/* More menu - only for My Jobs */}
                    {isMyJobs && (
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
                                        className="flex w-full items-center gap-[0.5vw] rounded-md px-3 py-2 text-left hover:bg-fill-subtle"
                                    >
                                        <Edit size={15} />
                                        Edit
                                    </button>

                                    {job.listingStatus === 'OPEN' && (
                                        <button
                                            type="button"
                                            className="flex w-full items-center gap-[0.5vw] rounded-md px-3 py-2 text-left hover:bg-fill-subtle"
                                        >
                                            <FileX size={15} />
                                            Close
                                        </button>
                                    )}

                                    <hr className="my-1 border-0 border-t border-line" />

                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-[0.5vw] rounded-md px-3 py-2 text-left text-danger hover:bg-danger-wash"
                                    >
                                        <Trash size={15} />
                                        Delete
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
                                        className="rounded-status bg-accent px-[0.63vw] py-[0.19vh] type-sm !font-[600] text-ink"
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
                        {job.minBudget != null
                            ? job.minBudget.toLocaleString()
                            : '-'}
                        {' - '}
                        {job.maxBudget != null
                            ? job.maxBudget.toLocaleString()
                            : '-'}{' '}
                        THB
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
        </>
    );
}
