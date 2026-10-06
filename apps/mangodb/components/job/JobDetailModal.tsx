'use client';

import type { JobPosting } from '@mangodb/shared';

import { X, Hourglass, Building2, Tag, Wallet, MapPin } from 'lucide-react';

import Link from 'next/link';

import Image from 'next/image';

import ModalShell from '@/components/ui/ModalShell';

interface JobDetailModalProps {
    job: JobPosting;
    isOpen: boolean;
    onClose: () => void;
}

export default function JobDetailModal({
    job,
    isOpen,
    onClose,
}: JobDetailModalProps) {
    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            role="dialog"
            labelledBy="job-detail-title"
            backdropClassName="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 p-[2.08vw]"
            panelClassName="flex max-h-[92vh] w-[54.68vw] flex-col gap-[3.425vh] overflow-y-auto rounded-popup bg-surface-white pl-[2.29vw] pr-[2.29vw] pt-[3.33vh] pb-[4vh] leading-relaxed shadow-xl"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-[1.04vw]">
                <div className="flex flex-col gap-[1vh]">
                    {/* Categories */}
                    <div className="flex items-center gap-[0.52vw]">
                        <Tag size={20} />
                        <div className="flex min-h-[2.22vh] flex-wrap gap-[0.42vw]">
                            {job.categories && job.categories.length > 0 ? (
                                job.categories.map((category) => (
                                    <span
                                        key={category}
                                        className="
                                                    rounded-status
                                                    bg-accent
                                                    px-[0.63vw]
                                                    py-[0.19vh]
                                                "
                                    >
                                        {category}
                                    </span>
                                ))
                            ) : (
                                <span
                                    className="
                                            rounded-status
                                            bg-fill-subtle
                                            px-[0.63vw]
                                            py-[0.19vh]
                                        "
                                >
                                    General
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Title */}
                    <h2
                        id="job-detail-title"
                        className="
                                type-lg
                                !font-[700]
                                text-ink
                            "
                    >
                        {job.listingTitle}
                    </h2>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close Job details"
                    className="
                            rounded-button
                            p-[0.52vw]
                            text-ink-soft
                            hover:bg-line
                            focus-visible:ring-2
                            focus-visible:ring-brand
                            focus-visible:outline-none
                        "
                >
                    <X
                        aria-hidden="true"
                        className="
                                h-[2.22vh]
                                w-[1.25vw]
                            "
                    />
                </button>
            </div>

            {job && (
                <div
                    className="
                            flex
                            flex-col
                            items-center
                            justify-center
                            gap-[3.425vh]
                        "
                >
                    <div
                        className="
                                flex
                                w-full
                                flex-col
                                gap-[1.48vh]
                                pl-[2vw]
                                pr-[2vw]
                                type-sm
                            "
                    >
                        {/* Description */}
                        <div className="w-full text-left">
                            <span className="type-sm text-brand">
                                Description :
                            </span>

                            <p
                                className="
                                        mt-[1vh]
                                        mb-[1vh]
                                        ml-[1vw]
                                        leading-relaxed
                                        text-ink
                                    "
                            >
                                {job.listingDesc ||
                                    'No job description provided.'}
                            </p>
                        </div>

                        {/* Budget */}
                        <hr className="w-full border-0 border-t border-brand/50" />

                        <div
                            className="
                                    flex
                                    w-full
                                    items-center
                                    justify-between
                                    pr-[0.5vw]
                                    type-sm
                                    text-ink
                                "
                        >
                            <span className="text-brand">Budget</span>

                            <div>
                                {job.minBudget != null
                                    ? job.minBudget.toLocaleString()
                                    : '-'}
                                {' - '}
                                {job.maxBudget != null
                                    ? job.maxBudget.toLocaleString()
                                    : '-'}{' '}
                                THB
                            </div>

                            <Wallet size={20} />
                        </div>

                        {/* Duration */}
                        <hr className="w-full border-0 border-t border-brand/50" />

                        <div
                            className="
                                    flex
                                    w-full
                                    items-center
                                    justify-between
                                    pr-[0.5vw]
                                    type-sm
                                    text-brand
                                "
                        >
                            <span>Duration</span>

                            <div className="text-ink">
                                {job.duration || 'No job duration provided'}
                            </div>

                            <Hourglass size={20} color="black" />
                        </div>

                        {/* Deadline */}
                        <hr className="w-full border-0 border-t border-brand/50" />

                        <div
                            className="
                                    flex
                                    w-full
                                    items-center
                                    justify-between
                                    pr-[0.5vw]
                                    type-sm
                                    text-brand
                                "
                        >
                            <span>Deadline</span>

                            <div className="text-ink">
                                {job.deadline
                                    ? new Date(job.deadline).toLocaleDateString(
                                          'en-GB',
                                          {
                                              day: 'numeric',
                                              month: 'short',
                                              year: 'numeric',
                                          },
                                      )
                                    : 'No job deadline provided'}
                            </div>

                            <Image
                                src="/images/deadline.svg"
                                alt="Deadline"
                                width={22}
                                height={22}
                            />
                        </div>

                        {/* Location */}
                        <hr className="w-full border-0 border-t border-brand/50" />

                        <div
                            className="
                                    flex
                                    w-full
                                    items-center
                                    justify-between
                                    pr-[0.5vw]
                                    type-sm
                                    text-ink
                                "
                        >
                            <span className="text-brand">Location</span>

                            <div>
                                {job.locationPref || 'No location provided.'}
                            </div>

                            <MapPin size={20} />
                        </div>

                        {/* Company */}
                        <hr className="w-full border-0 border-t border-brand/50" />

                        <div
                            className="
                                    flex
                                    w-full
                                    items-center
                                    justify-between
                                    pr-[0.5vw]
                                    type-sm
                                    text-brand
                                "
                        >
                            <span>Company</span>

                            <Link
                                href={`/company/${job.companyId}`}
                                className="
                                        !font-[600]
                                        text-ink
                                        hover:underline
                                    "
                            >
                                {job.companyName}
                            </Link>

                            <Building2 size={22} color="black" />
                        </div>

                        {/* Created at */}
                        <hr className="w-full border-0 border-t border-brand/50" />

                        <div
                            className="
                                    flex
                                    w-full
                                    justify-end
                                    pr-[0.5vw]
                                    type-sm
                                    text-brand
                                "
                        >
                            Created at :{' '}
                            {job.createdAt
                                ? new Date(job.createdAt).toLocaleDateString(
                                      'en-GB',
                                      {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                      },
                                  )
                                : 'No creation date provided'}
                        </div>
                    </div>
                </div>
            )}
        </ModalShell>
    );
}
