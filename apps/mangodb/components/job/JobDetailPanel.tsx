'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CompanyProfile, Job } from '@mangodb/shared';

import { ArrowLeft } from 'lucide-react';

import SubmitProposalModal from '@/components/proposals/SubmitProposalModal';
import { isNotSignedIn } from '@/lib/api';
import { getMyProfile } from '@/lib/companies';
import { formatBudgetRange } from '@/lib/money';
import { isProviderAccount } from '@/lib/roles';
import { redirectToUnauthorized } from '@/lib/session';

interface JobDetailPanelProps {
    job: Job | null;
    onClose: () => void;
}

export default function JobDetailPanel({ job, onClose }: JobDetailPanelProps) {
    const [viewer, setViewer] = useState<CompanyProfile | null>(null);
    const [isProposalFormOpen, setIsProposalFormOpen] = useState(false);

    // Who is looking decides whether Add Proposal shows. getMyProfile is
    // cached, so the many panels that open in a session ask the API once.
    useEffect(() => {
        getMyProfile()
            .then(setViewer)
            .catch((cause: unknown) => {
                // The session ended after the list loaded: same redirect as
                // the page guard. Any other failure just hides the button.
                if (isNotSignedIn(cause)) redirectToUnauthorized();
            });
    }, []);

    // US2-8. The API would refuse the other cases anyway (403 for a
    // Receiver-only account or your own posting, 409 for a closed one), so
    // the button is only offered where a submission can succeed (T2.8.10).
    const canSubmitProposal =
        job !== null &&
        viewer !== null &&
        isProviderAccount(viewer.accountType) &&
        job.listingStatus === 'OPEN' &&
        job.company.companyId !== viewer.companyId;

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
                    <ArrowLeft size={22} />
                </button>
            </div>

            <hr className="my-[2vh] border-0 border-t border-brand/30" />

            {/* Job Detail */}
            {job && (
                <div className="flex flex-1 flex-col overflow-y-auto pr-[0.5vw]">
                    {/* Company */}
                    <div className="flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-brand">Company</span>

                        <Link
                            href={`/profile/${job.company.companyId}`}
                            className="type-md text-ink pl-[0.5vw] hover:underline [overflow-wrap:anywhere]"
                        >
                            {job.company.companyName}
                        </Link>
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
                                            bg-accent-tint
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

                    {/* Description */}
                    <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-brand">Description</span>

                        <p className="type-sm leading-relaxed text-ink pl-[0.5vw] [overflow-wrap:anywhere]">
                            {job.listingDesc}
                        </p>
                    </div>

                    {/* Budget */}
                    <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-brand">Budget</span>

                        <p className="type-md text-ink pl-[0.5vw]">
                            {formatBudgetRange(job.minBudget, job.maxBudget)}
                        </p>
                    </div>

                    {/* Location */}
                    <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-brand">Location</span>

                        <p className="type-md text-ink pl-[0.5vw] [overflow-wrap:anywhere]">
                            {job.locationPref ?? 'No location preference'}
                        </p>
                    </div>

                    {/* Duration */}
                    <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-brand">Duration</span>

                        <p className="type-md text-ink pl-[0.5vw] [overflow-wrap:anywhere]">
                            {job.duration ?? 'Not specified'}
                        </p>
                    </div>

                    {/* Deadline */}
                    <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                        <span className="type-sm text-brand">Deadline</span>

                        <p className="type-md text-ink pl-[0.5vw] [overflow-wrap:anywhere]">
                            {job.deadline ?? 'No deadline'}
                        </p>
                    </div>

                    {/* Bottom action */}
                    {canSubmitProposal && (
                        <div className="mt-auto pt-[2vh]">
                            <button
                                type="button"
                                onClick={() => setIsProposalFormOpen(true)}
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
                                Add Proposal
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* key: a different job starts with an empty form. */}
            {job && canSubmitProposal && (
                <SubmitProposalModal
                    key={job.jobId}
                    isOpen={isProposalFormOpen}
                    jobPosting={job}
                    onClose={() => setIsProposalFormOpen(false)}
                />
            )}
        </div>
    );
}
