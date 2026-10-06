'use client';

import type { JobPosting } from '@mangodb/shared';

import { X } from 'lucide-react';

interface JobDetailPanelProps {
    job: JobPosting | null;
    onClose: () => void;
}

export default function JobDetailPanel({ job, onClose }: JobDetailPanelProps) {
    return (
        <div
            className="
                flex
                h-[72.63vh]
                w-[34vw]
                flex-col
                rounded-popup
                bg-surface-white
                px-[1.5vw]
                py-[2.5vh]
                text-left
                shadow-[0_0_8px_rgba(73,123,147,0.25)]
            "
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-[0.8vh]">
                    <span className="type-sm text-brand">Job Detail</span>

                    {job && (
                        <h2 className="type-lg !font-[700] text-ink">
                            {job.listingTitle}
                        </h2>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close job detail"
                    className="rounded-full p-2 transition hover:bg-fill-subtle"
                >
                    <X size={22} />
                </button>
            </div>

            <hr className="my-[2vh] border-0 border-t border-brand/30" />

            {/* Job Detail */}
            {job && (
                <div className="flex flex-1 flex-col overflow-y-auto pr-[0.5vw]">
                    {/* Company */}
                    <div className="flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-brand">Company</span>

                        <p className="type-md text-ink pl-[0.5vw]">
                            {job.companyName}
                        </p>
                    </div>

                    {/* Categories */}
                    <div className="mt-[2vh] flex flex-col gap-[0.8vh]">
                        <span className="type-sm text-brand">Categories</span>

                        <div className="flex flex-wrap gap-[0.42vw] pl-[0.5vw]">
                            {job.categories?.length ? (
                                job.categories.map((category) => (
                                    <span
                                        key={category}
                                        className="
                                            rounded-status
                                            bg-accent
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
                        <span className="type-sm text-brand">Description</span>

                        <p className="type-sm leading-relaxed text-ink pl-[0.5vw]">
                            {job.listingDesc}
                        </p>
                    </div>

                    {/* Budget */}
                    <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-brand">Budget</span>

                        <p className="type-md text-ink pl-[0.5vw]">
                            {job.minBudget ?? '-'} - {job.maxBudget ?? '-'} THB
                        </p>
                    </div>

                    {/* Location */}
                    <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-brand">Location</span>

                        <p className="type-md text-ink pl-[0.5vw]">
                            {job.locationPref ?? 'No location preference'}
                        </p>
                    </div>

                    {/* Duration */}
                    <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-brand">Duration</span>

                        <p className="type-md text-ink pl-[0.5vw]">
                            {job.duration ?? 'Not specified'}
                        </p>
                    </div>

                    {/* Deadline */}
                    <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-brand">Deadline</span>

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
                                bg-brand
                                type-md
                                text-surface-white
                                transition
                                hover:bg-brand-dark
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
