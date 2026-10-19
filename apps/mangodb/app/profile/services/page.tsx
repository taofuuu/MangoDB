'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ServiceSummary, ServiceListing } from '@mangodb/shared';
import { Plus } from 'lucide-react';

import { describeError, isNotSignedIn } from '@/lib/api';
import { listMyServices, deleteService } from '@/lib/services';
import { redirectToUnauthorized } from '@/lib/session';
import Pagination from '@/components/ui/Pagination';
import OtherCompanyServiceCard from '@/components/service/OtherCompanyServiceCard';
import { OtherCompanyServiceDetailPanel } from '@/components/service/OtherCompanyServiceDetailPanel';

const PAGE_SIZE = 5;

// Placeholder routes: update these when the create/edit pages are ready.
const ADD_SERVICE_PATH = '/profile/services/create';

const getEditServicePath = (serviceId: number) =>
    `/profile/services/${serviceId}/edit`;

type ServiceItem = ServiceListing | ServiceSummary;

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-line bg-surface-white px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fill-subtle text-ink-soft">
                <Plus className="h-7 w-7" />
            </div>

            <h2 className="type-md font-semibold text-ink">No services yet</h2>

            <p className="mt-2 max-w-md type-sm text-ink-soft">
                Create your first service listing to let other companies
                discover what your company offers.
            </p>

            <Link
                href={ADD_SERVICE_PATH}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
                <Plus className="h-4 w-4" />
                Add your first service
            </Link>
        </div>
    );
}

export default function MyServicesPage() {
    const router = useRouter();

    const [services, setServices] = useState<ServiceListing[]>([]);
    const [selectedService, setSelectedService] = useState<ServiceItem | null>(
        null,
    );

    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadServices() {
            setIsLoading(true);
            setError(null);

            try {
                const result = await listMyServices();

                if (cancelled) return;

                setServices(result);
            } catch (err) {
                if (cancelled) return;

                if (isNotSignedIn(err)) {
                    redirectToUnauthorized();
                    return;
                }

                setError(describeError(err));
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadServices();

        return () => {
            cancelled = true;
        };
    }, []);

    const totalPages = Math.max(1, Math.ceil(services.length / PAGE_SIZE));

    const currentPage = Math.min(page, totalPages);

    const visibleServices = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return services.slice(startIndex, startIndex + PAGE_SIZE);
    }, [services, currentPage]);

    function handleViewDetail(service: ServiceItem) {
        setSelectedService(service);
        setDeleteError(null);
    }

    function handleEdit(service: ServiceItem) {
        router.push(getEditServicePath(service.serviceId));
    }

    // function handleToggleStatus(_service: ServiceItem) {
    //     window.alert('Open/Close service is not implemented yet.');
    // }

    async function handleDelete(service: ServiceItem) {
        if (deletingId !== null) return;

        const confirmed = window.confirm(
            `Are you sure you want to delete "${service.listingTitle}"? This action cannot be undone.`,
        );

        if (!confirmed) return;

        setDeletingId(service.serviceId);
        setDeleteError(null);

        try {
            await deleteService(service.serviceId);

            const remainingServices = services.filter(
                (item) => item.serviceId !== service.serviceId,
            );

            setServices(remainingServices);

            setSelectedService((current) =>
                current?.serviceId === service.serviceId ? null : current,
            );

            const nextTotalPages = Math.max(
                1,
                Math.ceil(remainingServices.length / PAGE_SIZE),
            );

            setPage((current) => Math.min(current, nextTotalPages));
        } catch (err) {
            if (isNotSignedIn(err)) {
                redirectToUnauthorized();
                return;
            }

            setDeleteError(describeError(err));
        } finally {
            setDeletingId(null);
        }
    }

    const pagination = {
        page: currentPage,
        pageSize: PAGE_SIZE,
        totalItems: services.length,
        totalPages,
    };

    return (
        <main className="min-h-screen bg-surface px-6 py-8 lg:px-12">
            <div className="mx-auto max-w-6xl">
                {/* Page header */}
                <div className="mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="type-lg !font-bold text-ink">
                                My Services
                            </h1>
                        </div>

                        <Link
                            href="/services/create"
                            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                        >
                            <Plus className="h-4 w-4" />
                            Add Service
                        </Link>
                    </div>

                    <div className="mt-3 h-px w-full bg-brand/30" />
                </div>

                {/* Delete error */}
                {deleteError && (
                    <div
                        role="alert"
                        className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <p>{deleteError}</p>

                            <button
                                type="button"
                                onClick={() => setDeleteError(null)}
                                aria-label="Dismiss error"
                                className="shrink-0 font-semibold hover:underline"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {isLoading && (
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-32 w-full animate-pulse rounded-[20px] bg-line/60"
                            />
                        ))}
                    </div>
                )}

                {/* Loading error */}
                {!isLoading && error && (
                    <div
                        role="alert"
                        className="rounded-[20px] border border-red-200 bg-red-50 px-6 py-8 text-center"
                    >
                        <p className="text-sm text-red-700">{error}</p>

                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && !error && services.length === 0 && (
                    <EmptyState />
                )}

                {/* Services list + detail panel */}
                {!isLoading && !error && services.length > 0 && (
                    <>
                        <div
                            className={
                                selectedService
                                    ? 'grid grid-cols-1 gap-6 lg:grid-cols-12'
                                    : 'grid grid-cols-1'
                            }
                        >
                            {/* Service list */}
                            <section
                                className={
                                    selectedService
                                        ? 'min-w-0 lg:col-span-5'
                                        : 'min-w-0'
                                }
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    {/* <h2 className="type-md font-semibold text-ink">
                                        Your listings
                                    </h2> */}

                                    <span className="type-sm text-ink-soft">
                                        {services.length}{' '}
                                        {services.length === 1
                                            ? 'service'
                                            : 'services'}
                                    </span>
                                </div>

                                <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
                                    {visibleServices.map((service) => (
                                        <OtherCompanyServiceCard
                                            key={service.serviceId}
                                            service={service}
                                            isSelected={
                                                selectedService?.serviceId ===
                                                service.serviceId
                                            }
                                            onViewDetail={handleViewDetail}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                            // onToggleStatus={handleToggleStatus}
                                        />
                                    ))}
                                </div>

                                {services.length > PAGE_SIZE && (
                                    <div className="mt-5">
                                        <Pagination
                                            pagination={pagination}
                                            onPageChange={setPage}
                                            ariaLabel="My services pages"
                                            isLoading={isLoading}
                                        />
                                    </div>
                                )}
                            </section>

                            {/* Service detail */}
                            {selectedService && (
                                <section className="min-w-0 lg:col-span-7">
                                    <OtherCompanyServiceDetailPanel
                                        service={selectedService}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        // onToggleStatus={handleToggleStatus}
                                    />
                                </section>
                            )}

                            {/* Pagination */}
                            <Pagination
                                pagination={pagination}
                                onPageChange={setPage}
                                ariaLabel="Company services pages"
                                isLoading={isLoading}
                            />
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
