'use client';

import React, { useEffect, useState } from 'react';
import type { JobPosting } from '@mangodb/shared';
import JobDetailModal from '@/components/job/JobDetailModal';
import { describeError, isNotSignedIn } from '@/lib/api';
import { formatDateOnly } from '@/lib/dates';
import { listJobPostings, listMyJobPostings } from '@/lib/jobPostings';
import { PROFILE_LIST_SIZE } from '@/lib/pagination';
import { formatServiceBudgetRange } from '@/lib/services';
import { redirectToUnauthorized } from '@/lib/session';

// A receiver's job postings. Another company's profile (readOnly) shows only
// OPEN ones, from GET /job-postings?companyId=. Your own shows every status,
// from GET /job-postings/mine, so closed ones stay in view (US2-2).
export default function JobListing({
    companyId,
    readOnly = false,
}: {
    companyId: number;
    readOnly?: boolean;
}) {
    // null until the list answers, so "Loading…" shows instead of a
    // momentary "No job listings yet."
    const [jobs, setJobs] = useState<JobPosting[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

    useEffect(() => {
        let cancelled = false;

        const request = readOnly
            ? listJobPostings(1, PROFILE_LIST_SIZE, {
                  companyId,
                  status: 'OPEN',
              })
            : listMyJobPostings(1, PROFILE_LIST_SIZE);

        request
            .then((data) => {
                if (!cancelled) setJobs(data.items);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                if (isNotSignedIn(err)) {
                    redirectToUnauthorized();
                    return;
                }
                setLoadError(describeError(err));
            });

        return () => {
            cancelled = true;
        };
    }, [companyId, readOnly]);

    return (
        <div className="bg-white rounded-popup p-8 w-full h-full border border-line shadow-sm flex flex-col overflow-hidden">
            <h3 className="type-md !font-bold text-gray-900 mb-4 px-1">
                Job Listing
            </h3>

            {loadError && (
                <p className="type-xs text-danger mb-2 px-1">{loadError}</p>
            )}

            {/* Same inset panel the provider page's timeline sits in, and the
                list scrolls inside it rather than growing the card. */}
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-button border border-line bg-gray-50/70 p-4">
                {jobs === null && !loadError && (
                    <p className="type-xs text-ink-placeholder">Loading…</p>
                )}
                {jobs?.length === 0 && !loadError && (
                    <p className="type-xs text-ink-placeholder">
                        {readOnly
                            ? 'No open job listings.'
                            : 'No job listings yet.'}
                    </p>
                )}
                {jobs?.map((job) => (
                    <div
                        key={job.jobPostingId}
                        className="bg-white rounded-button px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between shadow-sm border border-line shrink-0"
                    >
                        <div className="flex flex-1 items-center gap-2 type-sm !font-bold text-gray-900">
                            {job.listingTitle}
                            {job.listingStatus === 'CLOSED' && (
                                <span className="shrink-0 rounded-status bg-danger-tint px-2 type-xs !font-normal text-danger">
                                    Closed
                                </span>
                            )}
                        </div>

                        <div className="flex gap-20 type-xs text-gray-400 mr-8 mt-2 sm:mt-0">
                            <div className="flex flex-col items-start">
                                <span className="type-xs text-gray-400">
                                    Budget
                                </span>
                                <span className="font-semibold text-gray-800">
                                    {formatServiceBudgetRange(
                                        job.minBudget,
                                        job.maxBudget,
                                    )}
                                </span>
                            </div>

                            <div className="flex flex-col items-start">
                                <span className="type-xs text-gray-400">
                                    Deadline
                                </span>
                                <span className="font-semibold text-gray-800">
                                    {job.deadline
                                        ? formatDateOnly(job.deadline)
                                        : '—'}
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setSelectedJob(job)}
                            aria-label={`Details for ${job.listingTitle}`}
                            className="text-brand hover:underline type-xs !font-medium mt-2 sm:mt-0 transition-colors ml-8"
                        >
                            Details
                        </button>
                    </div>
                ))}
            </div>

            {selectedJob && (
                <JobDetailModal
                    job={selectedJob}
                    isOpen
                    onClose={() => setSelectedJob(null)}
                />
            )}
        </div>
    );
}
