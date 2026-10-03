'use client';

import type { JobPosting } from '@mangodb/shared';

import { X } from 'lucide-react';

interface JobDetailPanelProps {
    job: JobPosting | null;
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
}

export default function JobDetailPanel({
    job,
    isLoading,
    error,
    onClose,
}: JobDetailPanelProps) {
    return (
        <div
            className="
                flex
                h-[72.63vh]
                w-[34vw]
                flex-col
                rounded-[30px]
                bg-white
                px-[1.5vw]
                py-[2.5vh]
                text-left
                shadow-[0_0_8px_rgba(73,123,147,0.25)]
            "
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-[0.8vh]">
                    <span className="type-sm text-[#497B93]">Job Detail</span>

                    {!isLoading && !error && job ? (
                        <h2 className="type-lg !font-[700] text-ink">
                            {job.listingTitle}
                        </h2>
                    ) : (
                        <div className="h-[3.5vh] w-[14vw] animate-pulse rounded bg-line" />
                    )}
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close job detail"
                    className="rounded-full p-2 transition hover:bg-gray-100"
                >
                    <X size={22} />
                </button>
            </div>

            <hr className="my-[2vh] border-0 border-t border-[#497B93]/30" />

            {/* Loading */}
            {isLoading && (
                <div className="flex flex-1 flex-col gap-[1vh] max-h-[72.63vh] max-w-[34vw]">
                    {/* Company */}
                    <div className="flex flex-col gap-[0.6vh]">
                        <div className="h-[2vh] w-[5vw] animate-pulse rounded bg-line" />
                        <div className="h-[2.5vh] w-[15vw] animate-pulse rounded bg-line" />
                    </div>

                    {/* Categories */}
                    <div className="flex flex-col gap-[0.8vh]">
                        <div className="h-[2vh] w-[7vw] animate-pulse rounded bg-line" />

                        <div className="flex gap-[0.42vw]">
                            <div className="h-[2.8vh] w-[4vw] animate-pulse rounded-status bg-line" />
                            <div className="h-[2.8vh] w-[6vw] animate-pulse rounded-status bg-line" />
                            <div className="h-[2.8vh] w-[7vw] animate-pulse rounded-status bg-line" />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-[0.8vh]">
                        <div className="h-[2vh] w-[7vw] animate-pulse rounded bg-line" />

                        <div className="flex flex-col gap-[0.7vh]">
                            <div className="h-[1.8vh] w-full animate-pulse rounded bg-line" />
                            <div className="h-[1.8vh] w-[95%] animate-pulse rounded bg-line" />
                            <div className="h-[1.8vh] w-[80%] animate-pulse rounded bg-line" />
                        </div>
                    </div>

                    {/* Budget */}
                    <div className="flex flex-col gap-[0.6vh]">
                        <div className="h-[2vh] w-[5vw] animate-pulse rounded bg-line" />
                        <div className="h-[2.5vh] w-[10vw] animate-pulse rounded bg-line" />
                    </div>

                    {/* Location */}
                    <div className="flex flex-col gap-[0.6vh]">
                        <div className="h-[2vh] w-[6vw] animate-pulse rounded bg-line" />
                        <div className="h-[2.5vh] w-[12vw] animate-pulse rounded bg-line" />
                    </div>

                    {/* Duration */}
                    <div className="flex flex-col gap-[0.6vh]">
                        <div className="h-[2vh] w-[6vw] animate-pulse rounded bg-line" />
                        <div className="h-[2.5vh] w-[8vw] animate-pulse rounded bg-line" />
                    </div>

                    {/* Deadline */}
                    <div className="flex flex-col gap-[0.6vh]">
                        <div className="h-[2vh] w-[6vw] animate-pulse rounded bg-line" />
                        <div className="h-[2.5vh] w-[10vw] animate-pulse rounded bg-line" />
                    </div>

                    {/* Bottom button */}
                    <div className="mt-auto pt-[2vh]">
                        <div className="h-[4.5vh] w-full animate-pulse rounded-full bg-line" />
                    </div>
                </div>
            )}

            {/* Error */}
            {!isLoading && error && (
                <div className="flex flex-1 items-center justify-center">
                    <div className="flex flex-col items-center gap-[1vh] text-center">
                        <p className="type-md text-danger">
                            Failed to load job details.
                        </p>

                        <p className="type-sm text-ink-soft">{error}</p>
                    </div>
                </div>
            )}

            {/* Job Detail */}
            {!isLoading && !error && job && (
                <div className="flex flex-1 flex-col overflow-y-auto modal-scrollbar pr-[0.5vw]">
                    {/* Company */}
                    <div className="flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-[#497B93]">Company</span>

                        <p className="type-md text-ink pl-[0.5vw]">
                            {job.companyName}
                        </p>
                    </div>

                    {/* Categories */}
                    <div className="mt-[2vh] flex flex-col gap-[0.8vh]">
                        <span className="type-sm text-[#497B93]">
                            Categories
                        </span>

                        <div className="flex flex-wrap gap-[0.42vw] pl-[0.5vw]">
                            {job.categories?.length ? (
                                job.categories.map((category) => (
                                    <span
                                        key={category}
                                        className="
                                            rounded-status
                                            bg-[#FEC84A]
                                            px-[0.63vw]
                                            py-[0.19vh]
                                            type-sm
                                            !font-[600]
                                            text-ink
                                        "
                                    >
                                        {category}
                                    </span>
                                ))
                            ) : (
                                <span className="type-sm text-ink-soft">
                                    General
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-[#497B93]">
                            Description
                        </span>

                        <p className="type-sm leading-relaxed text-ink pl-[0.5vw]">
                            {job.listingDesc}
                        </p>
                    </div>

                    {/* Budget */}
                    <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-[#497B93]">Budget</span>

                        <p className="type-md text-ink pl-[0.5vw]">
                            {job.minBudget ?? '-'} - {job.maxBudget ?? '-'} THB
                        </p>
                    </div>

                    {/* Location */}
                    <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-[#497B93]">Location</span>

                        <p className="type-md text-ink pl-[0.5vw]">
                            {job.locationPref ?? 'No location preference'}
                        </p>
                    </div>

                    {/* Duration */}
                    <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-[#497B93]">Duration</span>

                        <p className="type-md text-ink pl-[0.5vw]">
                            {job.duration ?? 'Not specified'}
                        </p>
                    </div>

                    {/* Deadline */}
                    <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-[#497B93]">Deadline</span>

                        <p className="type-md text-ink pl-[0.5vw]">
                            {job.deadline ?? 'No deadline'}
                        </p>
                    </div>

                    {/* Bottom action */}
                    <div className="mt-auto pt-[2vh]">
                        <button
                            type="button"
                            className="
                                flex
                                h-[4.5vh]
                                w-full
                                items-center
                                justify-center
                                rounded-full
                                bg-[#497B93]
                                type-md
                                text-white
                                transition
                                hover:bg-[#3F6B80]
                            "
                        >
                            Apply for this Job
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
