'use client';

import type { JobPosting } from '@mangodb/shared';

import Image from 'next/image';
import { MoreHorizontal, ArrowRight, Edit, Trash } from 'lucide-react';
import { useState } from 'react';

import { describeError } from '@/lib/api';
import { getJobPostingDetail } from '@/lib/job';
import JobDetailModal from '@/components/job/JobDetailModal';

interface JobBoxProps {
    job: JobPosting;
}

export default function OwnJobBox({ job }: JobBoxProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedJob, setSelectedJob] =
        useState<JobPosting | null>(null);

    const [isDetailLoading, setIsDetailLoading] =
        useState(false);

    const [detailError, setDetailError] =
        useState<string | null>(null);

    const openDetail = async () => {
        setIsMenuOpen(false);

        setIsDetailOpen(true);
        setIsDetailLoading(true);
        setSelectedJob(null);
        setDetailError(null);

        try {
            const detail = await getJobPostingDetail(
                job.jobPostingId,
            );

            setSelectedJob(detail);
        } catch (requestError: unknown) {
            setDetailError(describeError(requestError));
        } finally {
            setIsDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setIsDetailOpen(false);
        setSelectedJob(null);
        setDetailError(null);
        setIsDetailLoading(false);
    };

    return (
        <>
            <div
                className={`
                    relative
                    flex
                    min-h-[19.9vh]
                    w-[54.69vw]
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

                    ${job.listingStatus === 'OPEN'
                        ? 'shadow-[0_0_8px_rgba(73,123,147,0.35)]'
                        : job.listingStatus === 'CLOSED'
                            ? 'shadow-[0_0_8px_rgba(197,72,59,0.35)]'
                            : 'shadow-sm'
                    }
                `}
            >
                {/* Title + More button */}
                <div className="flex w-full items-center justify-between">
                    <h2 className="truncate type-md text-ink">
                        {job.listingTitle}
                    </h2>

                    {/* More menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() =>
                                setIsMenuOpen(
                                    (prev) => !prev,
                                )
                            }
                            aria-label="Job actions"
                            aria-expanded={isMenuOpen}
                            className="rounded-full p-2 transition hover:bg-gray-100"
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
                                    bg-white
                                    p-2
                                    shadow-lg
                                "
                            >
                                {/* Edit */}
                                <button
                                    type="button"
                                    className="flex w-full gap-[0.5vw] items-center rounded-md px-3 py-2 text-left hover:bg-[#F3F4F6]"
                                >
                                    <Edit size={15} />
                                    Edit
                                </button>

                                {/* Close - only for OPEN jobs */}
                                {job.listingStatus === 'OPEN' && (
                                    <button
                                        type="button"
                                        className="flex w-full gap-[0.5vw] items-center rounded-md px-3 py-2 text-left hover:bg-[#F3F4F6]"
                                    >
                                        Close
                                    </button>
                                )}

                                {/* Delete */}
                                <button
                                    type="button"
                                    className="flex w-full gap-[0.5vw] items-center rounded-md px-3 py-2 text-left hover:bg-[#F3F4F6]"
                                >
                                    <Trash size={15} />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Categories */}
                <div className="flex w-full items-start justify-between bg-transparent">
                    <div className="flex items-center gap-[0.52vw]">
                        <Image
                            src="/images/category.png"
                            alt="Category"
                            width={25}
                            height={25}
                        />

                        <div className="flex min-h-[2.22vh] flex-wrap gap-[0.42vw]">
                            {job.categories &&
                                job.categories.length > 0 ? (
                                job.categories.map((category) => (
                                    <span
                                        key={category}
                                        className="rounded-status bg-[#FEC84A] px-[0.63vw] py-[0.19vh] type-sm !font-[600] text-ink"
                                    >
                                        {category}
                                    </span>
                                ))
                            ) : (
                                <span className="rounded-status bg-[#F3F4F6] px-[0.63vw] py-[0.19vh] type-sm !font-[600]">
                                    General
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Budget + Location + Deadline */}
                <div className="flex w-full justify-between items-center">
                    <p className="flex items-center gap-[0.52vw] line-clamp-4 type-sm leading-relaxed">
                        <Image
                            src="/images/Budget.png"
                            alt="Budget"
                            width={25}
                            height={25}
                        />
                        {job.minBudget}-{job.maxBudget}
                    </p>

                    <p className="flex items-center gap-[0.52vw] line-clamp-4 type-sm leading-relaxed">
                        <Image
                            src="/images/deadline.svg"
                            alt="Deadline"
                            width={22}
                            height={22}
                        />
                        {job.deadline ||
                            'No job deadline provided.'}
                    </p>

                    {/* View Detail */}
                    <button
                        type="button"
                        onClick={openDetail}
                        className="flex gap-[0.5vw] w-[8.125vw] h-[4.07vh] rounded-[15px] border border-[#497B93] type-sm text-[#497B93] items-center justify-center hover:bg-[#497B93]/10"
                    >
                        View Detail
                        <ArrowRight size={15} />
                    </button>
                </div>
            </div>

            {/* Detail modal */}
            {isDetailOpen && (
                <JobDetailModal
                    job={selectedJob}
                    isLoading={isDetailLoading}
                    error={detailError}
                    onClose={closeDetail}
                />
            )}
        </>
    );
}