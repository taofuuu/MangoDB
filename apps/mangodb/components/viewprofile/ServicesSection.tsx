'use client';
import React, { useEffect, useState } from 'react';
import type { JobPosting, PublicCompanyProfile } from '@mangodb/shared';
import JobDetailModal from '@/components/job/JobDetailModal';
import { ServiceDetailPanel } from '@/components/searchservices/ServiceDetailPanel';
import ModalShell from '@/components/ui/ModalShell';
import Tag from '@/components/ui/Tag';
import { describeError, isNotSignedIn } from '@/lib/api';
import { listCategories } from '@/lib/categories';
import { listJobPostings, listMyJobPostings } from '@/lib/jobPostings';
import { PROFILE_LIST_SIZE } from '@/lib/pagination';
import { isReceiverAccount } from '@/lib/roles';
import {
    listCompanyServices,
    listMyServices,
    toServiceSummary,
    type ServiceSummary,
} from '@/lib/services';
import { redirectToUnauthorized } from '@/lib/session';

interface DisplayItem {
    id: number;
    title: string;
    body: string;
    closed: boolean;
}

// A service row and whether it is closed. ServiceSummary has no status, so
// it is carried beside it.
interface ServiceRow {
    summary: ServiceSummary;
    closed: boolean;
}

// The company's services and job postings. Another company's profile
// (readOnly) shows only OPEN ones, from the public lists filtered by
// companyId. Your own shows every status, from the /mine lists, so you can
// keep track of closed ones too (US2-2). Details opens the same views the
// search pages use.
export default function ServicesSection({
    profile,
    readOnly = false,
}: {
    profile: PublicCompanyProfile;
    readOnly?: boolean;
}) {
    const { companyId, companyName, companyPhoto, accountType } = profile;
    const [activeTab, setActiveTab] = useState<'services' | 'jobs'>('services');
    // null until the list answers, so "Loading…" shows instead of a
    // momentary "No services yet."
    const [services, setServices] = useState<ServiceRow[] | null>(null);
    const [jobs, setJobs] = useState<JobPosting[] | null>(null);
    // One per tab, so a failed services load does not hide the jobs.
    const [servicesError, setServicesError] = useState<string | null>(null);
    const [jobsError, setJobsError] = useState<string | null>(null);
    const [selectedService, setSelectedService] =
        useState<ServiceSummary | null>(null);
    const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadServices: Promise<ServiceRow[]> = readOnly
            ? listCompanyServices(companyId, PROFILE_LIST_SIZE).then((data) =>
                  data.items.map((summary) => ({ summary, closed: false })),
              )
            : Promise.all([listMyServices(), listCategories()]).then(
                  ([mine, categories]) =>
                      mine.map((listing) => ({
                          summary: toServiceSummary(listing, categories, {
                              companyId,
                              companyName,
                              companyPhoto,
                          }),
                          closed: listing.listingStatus === 'CLOSED',
                      })),
              );

        // GET /job-postings/mine is receiver-only, so a PROVIDER-only
        // company's own profile has no jobs to ask for.
        const loadJobs: Promise<JobPosting[]> = readOnly
            ? listJobPostings(1, PROFILE_LIST_SIZE, {
                  companyId,
                  status: 'OPEN',
              }).then((data) => data.items)
            : isReceiverAccount(accountType)
              ? listMyJobPostings(1, PROFILE_LIST_SIZE).then(
                    (data) => data.items,
                )
              : Promise.resolve([]);

        loadServices
            .then((rows) => {
                if (!cancelled) setServices(rows);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                if (isNotSignedIn(err)) {
                    redirectToUnauthorized();
                    return;
                }
                setServicesError(describeError(err));
            });

        loadJobs
            .then((items) => {
                if (!cancelled) setJobs(items);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                if (isNotSignedIn(err)) {
                    redirectToUnauthorized();
                    return;
                }
                setJobsError(describeError(err));
            });

        return () => {
            cancelled = true;
        };
    }, [readOnly, companyId, companyName, companyPhoto, accountType]);

    const loadError = activeTab === 'services' ? servicesError : jobsError;

    // null while the active tab's list is still loading.
    const displayItems: DisplayItem[] | null =
        activeTab === 'services'
            ? (services?.map(({ summary, closed }) => ({
                  id: summary.serviceId,
                  title: summary.listingTitle,
                  body: summary.listingDesc,
                  closed,
              })) ?? null)
            : (jobs?.map((job) => ({
                  id: job.jobPostingId,
                  title: job.listingTitle,
                  body: job.listingDesc,
                  closed: job.listingStatus === 'CLOSED',
              })) ?? null);

    const openDetail = (id: number) => {
        if (activeTab === 'services') {
            setSelectedService(
                services?.find(({ summary }) => summary.serviceId === id)
                    ?.summary ?? null,
            );
        } else {
            setSelectedJob(
                jobs?.find((job) => job.jobPostingId === id) ?? null,
            );
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 bg-gray-50 max-w-5xl mx-auto rounded-popup">
            <main className="bg-white rounded-popup p-8 border border-line shadow-sm flex flex-col relative w-full h-[420px] overflow-hidden">
                {/* Tab Switcher. Full width, so the two tabs split the card
                    rather than huddling in one corner of it. */}
                <div className="bg-gray-100 p-1 rounded-button flex w-full mb-4 type-xs">
                    <button
                        type="button"
                        onClick={() => setActiveTab('services')}
                        className={`flex-1 py-1.5 rounded-button font-medium transition ${
                            activeTab === 'services'
                                ? 'bg-white shadow text-brand'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Services
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('jobs')}
                        className={`flex-1 py-1.5 rounded-button font-medium transition ${
                            activeTab === 'jobs'
                                ? 'bg-white shadow text-brand'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Job Listing
                    </button>
                </div>

                {loadError && (
                    <p className="type-xs text-danger mb-2">{loadError}</p>
                )}

                {/* Display Content */}
                <div className="space-y-3 overflow-y-auto max-h-[500px] flex-1 pr-2">
                    {displayItems === null && !loadError && (
                        <p className="py-2 type-xs text-ink-placeholder">
                            Loading…
                        </p>
                    )}
                    {displayItems?.length === 0 && !loadError && (
                        <p className="py-2 type-xs text-ink-placeholder">
                            {activeTab === 'services'
                                ? 'No services yet.'
                                : readOnly
                                  ? 'No open job listings.'
                                  : 'No job listings yet.'}
                        </p>
                    )}
                    {displayItems?.map((item) => (
                        <div
                            key={item.id}
                            className="p-3 border border-gray-100 rounded-button bg-gray-50/50 hover:bg-gray-50 transition space-y-1"
                        >
                            <div className="flex justify-between items-center gap-3">
                                <span className="type-sm !font-semibold text-gray-800 truncate">
                                    {item.title || 'Untitled Item'}
                                </span>
                                {item.closed && (
                                    <Tag
                                        size="sm"
                                        label="Closed"
                                        className="ml-auto shrink-0 bg-danger-tint text-danger"
                                    />
                                )}
                                <button
                                    type="button"
                                    onClick={() => openDetail(item.id)}
                                    aria-label={`Details for ${item.title}`}
                                    className="shrink-0 type-xs text-brand hover:underline !font-medium"
                                >
                                    Details
                                </button>
                            </div>
                            <p className="type-xs text-gray-600 leading-relaxed line-clamp-2">
                                {item.body || 'No description provided.'}
                            </p>
                        </div>
                    ))}
                </div>
            </main>

            {/* ServiceDetailPanel is the search page's side panel; here it
                floats over the profile instead. */}
            <ModalShell
                isOpen={selectedService !== null}
                onClose={() => setSelectedService(null)}
                labelledBy="service-detail-title"
                backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-[2.08vw]"
            >
                {selectedService && (
                    <ServiceDetailPanel
                        service={selectedService}
                        onClose={() => setSelectedService(null)}
                    />
                )}
            </ModalShell>

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
