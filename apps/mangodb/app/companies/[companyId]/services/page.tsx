'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { PaginationMeta, ServiceSummary } from '@mangodb/shared';
import {
    describeError,
    isNotSignedIn,
    NOT_SIGNED_IN,
    parseId,
} from '@/lib/api';
import { getCompanyProfile } from '@/lib/companies';
import { COMPANY_SERVICES_PAGE_SIZE } from '@/lib/pagination';
import { listServices } from '@/lib/services';
import EmptyState from '@/components/ui/EmptyState';
import { redirectToUnauthorized } from '@/lib/session';
import Pagination from '@/components/ui/Pagination';
import CompanyServiceCard from '@/components/services/CompanyServiceCard';
import ServiceDetailPanel from '@/components/services/ServiceDetailPanel';

function CompanyServicesContent() {
    const companyId = parseId(useParams().companyId);
    const isValidCompanyId = companyId !== null;

    const [companyName, setCompanyName] = useState<string>('');
    const [page, setPage] = useState(1);

    const [services, setServices] = useState<ServiceSummary[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [selectedService, setSelectedService] =
        useState<ServiceSummary | null>(null);
    const [isLoading, setIsLoading] = useState(isValidCompanyId);
    const [error, setError] = useState<string | null>(null);

    // 1. Fetch company profile to get company name
    useEffect(() => {
        if (companyId === null) {
            return;
        }

        let active = true;

        getCompanyProfile(companyId)
            .then((profile) => {
                if (!active) return;
                if (profile?.companyName) {
                    setCompanyName(profile.companyName);
                }
            })
            .catch((err) => {
                if (!active) return;
                if (isNotSignedIn(err)) {
                    setError(NOT_SIGNED_IN);
                    redirectToUnauthorized();
                    return;
                }
                setError(
                    describeError(err, {
                        404: 'This company could not be found.',
                    }),
                );
                setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, [companyId]);

    // 2. Fetch services using listServices
    useEffect(() => {
        if (companyId === null) {
            return;
        }

        let active = true;

        listServices(page, COMPANY_SERVICES_PAGE_SIZE, { companyId })
            .then((res) => {
                if (!active) return;
                setError(null);
                setServices(res.items);
                setPagination(res.pagination);
                // Keep selectedService in sync if it still exists in current page
                setSelectedService((prev) => {
                    if (!prev) return null;
                    return (
                        res.items.find(
                            (item) => item.serviceId === prev.serviceId,
                        ) ?? prev
                    );
                });
            })
            .catch((err) => {
                if (!active) return;
                // The sentinel keeps the page blank while the redirect runs,
                // instead of flashing "No listing for this company".
                if (isNotSignedIn(err)) {
                    setError(NOT_SIGNED_IN);
                    redirectToUnauthorized();
                    return;
                }
                setError(describeError(err));
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, [companyId, page]);

    const titlePrefix = companyName ? `${companyName}’s` : 'Company name’s';

    if (error === NOT_SIGNED_IN) {
        return <div className="min-h-screen bg-surface" />;
    }

    const isDetailOpen = selectedService !== null;

    // The same layout as a company's jobs page (JobListPage): the list
    // centred on its own, then list and panel side by side, the panel
    // sliding in from the right. overflow-x-clip keeps that slide from
    // widening the page for a moment.
    return (
        <main className="min-h-screen overflow-x-clip bg-surface px-[1.67vw] py-[2.96vh]">
            <div
                className={`flex w-fit flex-col gap-[2.595vh] ${
                    isDetailOpen ? '' : 'mx-auto'
                }`}
            >
                <div
                    className={`flex flex-col gap-[1.3vh] transition-all duration-300 ${
                        isDetailOpen ? 'ml-[2vw] w-[91vw]' : 'ml-0 w-[56.56vw]'
                    }`}
                >
                    <h1 className="type-lg text-ink">
                        {isValidCompanyId && (
                            <Link
                                href={`/companies/${companyId}`}
                                aria-label="Back to the company profile"
                                className="pr-4"
                            >
                                ←
                            </Link>
                        )}
                        {companyName
                            ? `${companyName}’s Services`
                            : `${titlePrefix} listing`}
                    </h1>
                    <hr className="w-full shrink-0 border-0 border-t border-brand/50" />
                </div>

                <div
                    className={`mt-[2vh] flex items-start transition-all duration-300 ${
                        isDetailOpen ? 'ml-[2vw] gap-[1.5vw]' : ''
                    }`}
                >
                    <div className="flex h-[72.63vh] w-[56.56vw] flex-col">
                        <div className="min-h-0 flex-1 overflow-y-auto pr-[0.63vw]">
                            {!isValidCompanyId ? (
                                <p className="py-20 text-center type-sm text-ink-soft">
                                    This company could not be found.
                                </p>
                            ) : isLoading && services.length === 0 ? (
                                <div className="flex flex-col gap-4 pt-[1vh] pl-[0.5vw]">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="h-32 w-full animate-pulse rounded-[20px] bg-line/60"
                                        />
                                    ))}
                                </div>
                            ) : error ? (
                                <p className="py-20 text-center type-sm text-danger">
                                    {error}
                                </p>
                            ) : services.length === 0 ? (
                                <EmptyState title="No listing for this company" />
                            ) : (
                                <div className="flex flex-col gap-4 pt-[1vh] pl-[0.5vw]">
                                    {services.map((service) => (
                                        <CompanyServiceCard
                                            key={service.serviceId}
                                            service={service}
                                            isSelected={
                                                selectedService?.serviceId ===
                                                service.serviceId
                                            }
                                            // As on the jobs page: View
                                            // Detail opens, the panel's ←
                                            // closes.
                                            onViewDetail={setSelectedService}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <Pagination
                            pagination={pagination}
                            onPageChange={setPage}
                            ariaLabel="Company services pages"
                            isLoading={isLoading}
                            className="px-[0.5vw]"
                        />
                    </div>

                    {/* Slides in once; picking another service swaps the
                        panel inside without sliding again. */}
                    {selectedService && (
                        <div className="shrink-0 motion-safe:animate-slide-in">
                            <ServiceDetailPanel
                                key={selectedService.serviceId}
                                service={selectedService}
                                onClose={() => setSelectedService(null)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

export default function OtherCompanyServicesPage() {
    return <CompanyServicesContent />;
}
