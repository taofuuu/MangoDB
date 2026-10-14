'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type {
    PaginationMeta,
    ServiceListResponse,
    ServiceSummary,
} from '@mangodb/shared';
import { apiFetch, describeError, isNotSignedIn } from '@/lib/api';
import { getCompanyProfile, getMyProfile } from '@/lib/companies';
import { isProviderAccount } from '@/lib/roles';
import { redirectToUnauthorized } from '@/lib/session';
import UnauthorizedPage from '@/components/auth/UnauthorizedPage';
import Pagination from '@/components/ui/Pagination';
import { OtherCompanyServiceCard } from '@/components/service/OtherCompanyServiceCard';
import { OtherCompanyServiceDetailPanel } from '@/components/service/OtherCompanyServiceDetailPanel';

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            {/* Slashed card icon from Figma mock */}
            <div className="w-28 h-28 mb-6 text-[#bdc3c7]">
                <svg
                    width="100"
                    height="100"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <g clipPath="url(#clip0_17_17355)">
                        <path
                            d="M3.09011 4.44C2.70011 4.83 2.70011 5.46 3.09011 5.85L5.12011 7.88L5.00011 8.01V19C5.00011 20.1 5.90011 21 7.00011 21H17.0001C17.3501 21 17.6801 20.9 17.9701 20.74L19.1401 21.91C19.5301 22.3 20.1601 22.3 20.5501 21.91C20.9401 21.52 20.9401 20.89 20.5501 20.5L4.50011 4.44C4.11011 4.05 3.48011 4.05 3.09011 4.44ZM19.0001 16.11V5C19.0001 3.9 18.1001 3 17.0001 3H10.0101L7.95011 5.06L19.0001 16.11Z"
                            fill="#bdc3c7"
                        />
                    </g>
                    <defs>
                        <clipPath id="clip0_17_17355">
                            <rect width="24" height="24" fill="white" />
                        </clipPath>
                    </defs>
                </svg>
            </div>
            <p className="text-slate-400 font-normal text-sm">
                No listing for this company
            </p>
        </div>
    );
}

function CompanyServicesContent() {
    const searchParams = useSearchParams();
    const queryCompanyId =
        searchParams.get('companyId') || searchParams.get('id');
    const companyId = queryCompanyId ? Number(queryCompanyId) : null;
    const isValidCompanyId = Boolean(companyId && !isNaN(companyId));

    const [companyName, setCompanyName] = useState<string>(
        searchParams.get('name') || '',
    );
    const [page, setPage] = useState(1);
    const pageSize = 5;

    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(
        null,
    );
    const [isProvider, setIsProvider] = useState<boolean | null>(null);
    const [roleError, setRoleError] = useState<string | null>(null);
    const [services, setServices] = useState<ServiceSummary[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [selectedService, setSelectedService] =
        useState<ServiceSummary | null>(null);
    const [isLoading, setIsLoading] = useState(isValidCompanyId);
    const [error, setError] = useState<string | null>(null);

    // 1. Verify current user is logged in
    useEffect(() => {
        let active = true;

        getMyProfile()
            .then(() => {
                if (active) setIsAuthenticated(true);
            })
            .catch((err: unknown) => {
                if (!active) return;
                if (isNotSignedIn(err)) {
                    setIsAuthenticated(false);
                    redirectToUnauthorized();
                } else {
                    // Other errors (e.g. network failure)
                    setError(describeError(err));
                    setIsLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    // 2. Fetch company profile to check role and get company name
    useEffect(() => {
        if (!companyId || isNaN(companyId) || isAuthenticated === false) {
            return;
        }

        let active = true;

        getCompanyProfile(companyId)
            .then((profile) => {
                if (!active) return;
                setRoleError(null);
                if (profile?.companyName) {
                    setCompanyName(profile.companyName);
                }
                const canProvide = profile?.accountType
                    ? isProviderAccount(profile.accountType)
                    : false;
                setIsProvider(canProvide);

                if (!canProvide) {
                    const cName = profile?.companyName || 'This company';
                    setRoleError(
                        `${cName} is registered as a ${profile?.accountType || 'non-provider'} account. Only companies with a Provider or Both role can offer services.`,
                    );
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (!active) return;
                if (isNotSignedIn(err)) {
                    setIsAuthenticated(false);
                    redirectToUnauthorized();
                    return;
                }
                setError(describeError(err));
                setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, [companyId, isAuthenticated]);

    // 3. Fetch services only if the company is a PROVIDER or BOTH
    useEffect(() => {
        if (
            !companyId ||
            isNaN(companyId) ||
            isProvider !== true ||
            isAuthenticated !== true
        ) {
            return;
        }

        let active = true;

        const params = new URLSearchParams({
            companyId: String(companyId),
            page: String(page),
            pageSize: String(pageSize),
        });

        apiFetch<ServiceListResponse>(`/services?${params.toString()}`)
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
                    setIsAuthenticated(false);
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
    }, [companyId, isProvider, isAuthenticated, page]);

    const titlePrefix = companyName ? `${companyName}’s` : 'Company name’s';

    if (isAuthenticated === false) {
        return (
            <UnauthorizedPage
                title="Login Required"
                message="You need to be logged in to view company services."
            />
        );
    }

    return (
        <main className="min-h-screen bg-surface px-6 lg:px-12 py-8">
            <div className="mx-auto max-w-6xl">
                {/* Header Title */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-ink">
                        {companyName
                            ? `${companyName}’s Services`
                            : `${titlePrefix} listing`}
                    </h1>
                    <div className="h-px bg-brand/30 mt-3 w-full" />
                </div>

                {!companyId || isNaN(companyId) ? (
                    <div className="py-20 text-center text-ink-soft">
                        <p className="type-sm">
                            Please provide a valid companyId in the URL, e.g.{' '}
                            <code className="text-brand">?companyId=1</code>
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
                ) : roleError ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div className="max-w-md rounded-2xl border border-danger/30 bg-danger/5 p-6 text-center">
                            <h2 className="type-md font-bold text-danger mb-2">
                                Company Cannot Offer Services
                            </h2>
                            <p className="type-sm text-ink-soft leading-relaxed">
                                {roleError}
                            </p>
                        </div>
                    </div>
                ) : services.length === 0 ? (
                    <EmptyState />
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
    return (
        <Suspense
            fallback={
                <main className="min-h-screen bg-surface px-6 lg:px-12 py-8">
                    <div className="mx-auto max-w-6xl">
                        <div className="h-8 w-48 animate-pulse rounded bg-line mb-6" />
                        <div className="h-64 w-full animate-pulse rounded-[20px] bg-line/60" />
                    </div>
                </main>
            }
        >
            <CompanyServicesContent />
        </Suspense>
    );
}
