'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { PaginationMeta, ServiceSummary } from '@mangodb/shared';
import { describeError, isNotSignedIn, parseId } from '@/lib/api';
import { getCompanyProfile } from '@/lib/companies';
import { COMPANY_SERVICES_PAGE_SIZE } from '@/lib/pagination';
import { listServices } from '@/lib/services';
import EmptyState from '@/components/ui/EmptyState';
import { redirectToUnauthorized } from '@/lib/session';
import Pagination from '@/components/ui/Pagination';
import { OtherCompanyServiceCard } from '@/components/services/OtherCompanyServiceCard';
import { OtherCompanyServiceDetailPanel } from '@/components/services/OtherCompanyServiceDetailPanel';

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
                if (isNotSignedIn(err)) {
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

    return (
        <main className="min-h-screen bg-surface px-6 lg:px-12 py-8">
            <div className="mx-auto max-w-6xl">
                {/* Header Title */}
                <div className="mb-6">
                    <h1 className="type-lg !font-bold text-ink">
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
                    <div className="h-px bg-brand/30 mt-3 w-full" />
                </div>

                {!isValidCompanyId ? (
                    <div className="py-20 text-center text-ink-soft">
                        <p className="type-sm">
                            This company could not be found.
                        </p>
                    </div>
                ) : isLoading && services.length === 0 ? (
                    <div className="flex flex-col gap-4 py-8">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-32 w-full animate-pulse rounded-[20px] bg-line/60"
                            />
                        ))}
                    </div>
                ) : error ? (
                    <div className="py-20 text-center text-danger type-sm">
                        {error}
                    </div>
                ) : services.length === 0 ? (
                    <EmptyState title="No listing for this company" />
                ) : (
                    <div
                        className={`grid gap-6 transition-all ${
                            selectedService
                                ? 'grid-cols-1 lg:grid-cols-12'
                                : 'grid-cols-1 max-w-6xl'
                        }`}
                    >
                        {/* Service Cards List */}
                        <div
                            className={`flex flex-col space-y-4 ${
                                selectedService ? 'lg:col-span-5' : 'w-full'
                            }`}
                        >
                            <div className="flex flex-col space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                                {services.map((service) => (
                                    <OtherCompanyServiceCard
                                        key={service.serviceId}
                                        service={service}
                                        isSelected={
                                            selectedService?.serviceId ===
                                            service.serviceId
                                        }
                                        onViewDetail={() => {
                                            setSelectedService((prev) =>
                                                prev?.serviceId ===
                                                service.serviceId
                                                    ? null
                                                    : service,
                                            );
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Pagination */}
                            <Pagination
                                pagination={pagination}
                                onPageChange={setPage}
                                ariaLabel="Company services pages"
                                isLoading={isLoading}
                            />
                        </div>

                        {/* Service Detail Panel */}
                        {selectedService && (
                            <div className="lg:col-span-7">
                                <OtherCompanyServiceDetailPanel
                                    service={selectedService}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}

export default function OtherCompanyServicesPage() {
    return <CompanyServicesContent />;
}
