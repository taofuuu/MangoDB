'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { JobPosting } from '@mangodb/shared';
import { X, Hourglass, Building2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface JobDetailModalProps {
    job: JobPosting | null;
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
}

interface DetailRowProps {
    label: string;
    value: string | null;
}

function DetailRow({ label, value }: DetailRowProps) {
    return (
        <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-[1.04vw] border-b border-line py-[1.11vh]">
            <dt className="type-sm !font-[600] text-ink-soft">{label}</dt>
            <dd className="min-w-0 break-words type-sm text-ink">
                {value || 'Not provided'}
            </dd>
        </div>
    );
}

export default function JobDetailModal({
    job,
    isLoading,
    error,
    onClose,
}: JobDetailModalProps) {
    const router = useRouter();
    const panelRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        panelRef.current?.focus();

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', closeOnEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', closeOnEscape);
            if (
                previousFocus instanceof HTMLElement &&
                previousFocus.isConnected
            ) {
                previousFocus.focus();
            }
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-[2.08vw]"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                ref={panelRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="company-detail-title"
                className="flex flex-col max-h-[92vh] w-[54.68vw] gap-[3.425vh] rounded-popup bg-surface pl-[2.29vw] pr-[2.29vw] pt-[3.33vh] pb-[3.33vh] leading-relaxed shadow-xl"
            >
                <div className="flex items-start justify-between gap-[1.04vw]">
                    <div className="flex flex-col gap-[1vh]">
                        {/* Categories */}
                        <div className="flex items-center gap-[0.52vw]">

                            <div className="flex min-h-[2.22vh] flex-wrap gap-[0.42vw]">
                                {job?.categories &&
                                job.categories.length > 0 ? (
                                    job.categories.map((category) => (
                                        <span
                                            key={category}
                                            className="rounded-status bg-[#FEC84A] px-[0.63vw] py-[0.19vh]"
                                        >
                                            {category}
                                        </span>
                                    ))
                                ) : (
                                    <span className="rounded-status bg-[#F3F4F6] px-[0.63vw] py-[0.19vh]">
                                        General
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Listing title */}
                        <h2
                            id="job-detail-title"
                            className="type-lg !font-[700] text-ink"
                        >
                            {job?.listingTitle ?? 'Loading job'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close Job details"
                        className="rounded-button p-[0.52vw] text-ink-soft hover:bg-line focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    >
                        <X
                            aria-hidden="true"
                            className="h-[2.22vh] w-[1.25vw]"
                        />
                    </button>
                </div>

                {isLoading && (
                    <p className="py-[5.56vh] text-center type-md text-ink-soft">
                        Loading Company information…
                    </p>
                )}

                {job && !isLoading && !error && (
                    <div className="flex flex-col gap-[3.425vh] justify-center items-center">
                        <div className="flex flex-col pl-[2vw] pr-[2vw] type-sm items-center gap-[1.48vh]">
                            <div className="w-full text-left">
                                <span className="type-sm text-[#497B93]">
                                    Description :
                                </span>
                                <p className="mt-[1vh] mb-[1vh] ml-[1vw] text-[#000000] leading-relaxed">
                                    {job.listingDesc ||
                                        'No job description provided.'}
                                </p>
                            </div>
                            {/* Budget */}
                            <hr className="w-[46.875vw] border-0 border-t border-[#497B93]/50" />
                            <div className="flex w-full type-sm text-[#497B93] justify-between items-center pr-[0.5vw]">
                                Budget
                                <div className="text-[#000000]">
                                    {job.minBudget != null
                                        ? job.minBudget.toLocaleString()
                                        : '-'}
                                    {' - '}
                                    {job.maxBudget != null
                                        ? job.maxBudget.toLocaleString()
                                        : '-'}
                                </div>
                                <Image
                                    src="/images/Budget.png"
                                    alt="Budget"
                                    width={22}
                                    height={22}
                                />
                            </div>

                            {/* Duration */}
                            <hr className="w-[46.875vw] border-0 border-t border-[#497B93]/50" />
                            <div className="flex w-full type-sm text-[#497B93] justify-between items-center pr-[0.5vw]">
                                Duration
                                <div className="text-[#000000]">
                                    {job.duration || 'No job duration provided'}
                                </div>
                                <Hourglass size={20} color="black" />
                            </div>

                            {/* Deadline */}
                            <hr className="w-[46.875vw] border-0 border-t border-[#497B93]/50" />
                            <div className="flex w-full type-sm text-[#497B93] justify-between items-center pr-[0.5vw]">
                                Deadline
                                <div className="text-[#000000]">
                                    {job.deadline
                                        ? new Date(
                                              job.deadline,
                                          ).toLocaleDateString('en-GB', {
                                              day: 'numeric',
                                              month: 'short',
                                              year: 'numeric',
                                          })
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
                            <hr className="w-[46.875vw] border-0 border-t border-[#497B93]/50" />
                            <div className="flex w-full type-sm text-[#497B93] justify-between items-center pr-[0.5vw]">
                                Location
                                <div className="text-[#000000]">
                                    {job.locationPref ||
                                        'No location provided.'}
                                </div>
                                <Image
                                    src="/images/location.png"
                                    alt="Location"
                                    width={20}
                                    height={20}
                                />
                            </div>

                            {/* Company */}
                            <hr className="w-[46.875vw] border-0 border-t border-[#497B93]/50" />
                            <div className="flex w-full type-sm text-[#497B93] justify-between items-center pr-[0.5vw]">
                                Company
                                <Link
                                    href={`/company/${job.companyId}`}
                                    className="text-[#000000] !font-[600] hover:underline"
                                >
                                    {job.companyName}
                                </Link>
                                <Building2 size={22} color="black" />
                            </div>

                            {/* Created at */}
                            <hr className="w-[46.875vw] border-0 border-t border-[#497B93]/50" />
                            <div className="flex w-full type-sm text-[#497B93] justify-center items-center pr-[0.5vw]">
                                Created at :{' '}
                                {job.createdAt
                                    ? new Date(
                                          job.createdAt,
                                      ).toLocaleDateString('en-GB', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                      })
                                    : 'No creation date provided'}
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
