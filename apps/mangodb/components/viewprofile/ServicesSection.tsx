'use client';
import React, { useEffect, useState } from 'react';
import type { JobPosting } from '@mangodb/shared';
import JobDetailModal from '@/components/job/JobDetailModal';
import { ServiceDetailPanel } from '@/components/searchservices/ServiceDetailPanel';
import ModalShell from '@/components/ui/ModalShell';
import { describeError, isNotSignedIn } from '@/lib/api';
import { listJobPostings } from '@/lib/jobPostings';
import { PROFILE_LIST_SIZE } from '@/lib/pagination';
import { listCompanyServices, type ServiceSummary } from '@/lib/services';
import { redirectToUnauthorized } from '@/lib/session';

interface DisplayItem {
    id: number;
    title: string;
    body: string;
}

// The company's open services and open job postings. Both come from the
// public list endpoints filtered by companyId, so the same card works on your
// own profile and on another company's. Details opens the same views the
// search pages use.
export default function ServicesSection({ companyId }: { companyId: number }) {
    const [activeTab, setActiveTab] = useState<'services' | 'jobs'>('services');
    const [services, setServices] = useState<ServiceSummary[]>([]);
    const [jobs, setJobs] = useState<JobPosting[]>([]);
    // One per tab, so a failed services load does not hide the jobs.
    const [servicesError, setServicesError] = useState<string | null>(null);
    const [jobsError, setJobsError] = useState<string | null>(null);
    const [selectedService, setSelectedService] =
        useState<ServiceSummary | null>(null);
    const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

    useEffect(() => {
        let cancelled = false;

        listCompanyServices(companyId, PROFILE_LIST_SIZE)
            .then((data) => {
                if (!cancelled) setServices(data.items);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                if (isNotSignedIn(err)) {
                    redirectToUnauthorized();
                    return;
                }
                setServicesError(describeError(err));
            });

        listJobPostings(1, PROFILE_LIST_SIZE, { companyId, status: 'OPEN' })
            .then((data) => {
                if (!cancelled) setJobs(data.items);
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
    }, [companyId]);

    const loadError = activeTab === 'services' ? servicesError : jobsError;

    const displayItems: DisplayItem[] =
        activeTab === 'services'
            ? services.map((service) => ({
                  id: service.serviceId,
                  title: service.listingTitle,
                  body: service.listingDesc,
              }))
            : jobs.map((job) => ({
                  id: job.jobPostingId,
                  title: job.listingTitle,
                  body: job.listingDesc,
              }));

    const openDetail = (id: number) => {
        if (activeTab === 'services') {
            setSelectedService(
                services.find((service) => service.serviceId === id) ?? null,
            );
        } else {
            setSelectedJob(jobs.find((job) => job.jobPostingId === id) ?? null);
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
                    {displayItems.length === 0 && !loadError && (
                        <p className="py-2 type-xs text-ink-placeholder">
                            {activeTab === 'services'
                                ? 'No services yet.'
                                : 'No open job listings.'}
                        </p>
                    )}
                    {displayItems.map((item) => (
                        <div
                            key={item.id}
                            className="p-3 border border-gray-100 rounded-button bg-gray-50/50 hover:bg-gray-50 transition space-y-1"
                        >
                            <div className="flex justify-between items-center gap-3">
                                <span className="type-sm !font-semibold text-gray-800 truncate">
                                    {item.title || 'Untitled Item'}
                                </span>
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
