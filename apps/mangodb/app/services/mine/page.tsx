'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ServiceSummary } from '@mangodb/shared';
import { FilePlus } from 'lucide-react';
import PageGate from '@/components/auth/PageGate';
import CompanyServiceCard from '@/components/services/CompanyServiceCard';
import ServiceDetailPanel from '@/components/services/ServiceDetailPanel';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import SuccessModal from '@/components/ui/SuccessModal';
import { describeError, isNotSignedIn, NOT_SIGNED_IN } from '@/lib/api';
import { listCategories } from '@/lib/categories';
import { COMPANY_SERVICES_PAGE_SIZE } from '@/lib/pagination';
import {
    deleteService,
    listMyServices,
    toServiceSummary,
} from '@/lib/services';
import { redirectToUnauthorized } from '@/lib/session';
import { useMyCompany } from '@/lib/useMyCompany';

// A service and whether it is closed. ServiceSummary has no status, so it
// is carried beside it, as on the profile's Services tab.
type ServiceRow = {
    summary: ServiceSummary;
    closed: boolean;
};

// US2-2. Every service you own, open and closed, with Edit and Delete. The
// layout is a company's services page (/companies/[companyId]/services).
export default function MyServicesPage() {
    const me = useMyCompany('provider');

    if (me.status !== 'ready') {
        return (
            <PageGate
                state={me}
                roleMessage="You need a Provider account to manage services."
            />
        );
    }

    return <MyServices />;
}

function MyServices() {
    const router = useRouter();

    // null until the list answers, so the skeleton shows instead of a
    // momentary "No services yet".
    const [rows, setRows] = useState<ServiceRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [selectedService, setSelectedService] =
        useState<ServiceSummary | null>(null);
    const [pendingDelete, setPendingDelete] = useState<ServiceSummary | null>(
        null,
    );
    const [showDeleted, setShowDeleted] = useState(false);

    useEffect(() => {
        let active = true;

        // The listing holds category ids; the card shows names.
        Promise.all([listMyServices(), listCategories()])
            .then(([mine, categories]) => {
                if (!active) return;
                setRows(
                    mine.map((listing) => ({
                        summary: toServiceSummary(listing, categories),
                        closed: listing.listingStatus === 'CLOSED',
                    })),
                );
            })
            .catch((err) => {
                if (!active) return;
                if (isNotSignedIn(err)) {
                    setError(NOT_SIGNED_IN);
                    redirectToUnauthorized();
                    return;
                }
                setError(describeError(err));
            });

        return () => {
            active = false;
        };
    }, []);

    // GET /services/mine answers with every service at once, so the list
    // pages itself. A delete can shrink it under the current page.
    const totalItems = rows?.length ?? 0;
    const totalPages = Math.max(
        1,
        Math.ceil(totalItems / COMPANY_SERVICES_PAGE_SIZE),
    );
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * COMPANY_SERVICES_PAGE_SIZE;
    const visibleRows = (rows ?? []).slice(
        start,
        start + COMPANY_SERVICES_PAGE_SIZE,
    );

    const editService = (service: ServiceSummary) => {
        router.push(`/services/${service.serviceId}/edit`);
    };

    // A thrown error becomes the modal's message. On success the card goes
    // and "Service deleted" shows, as US2-4 asks.
    const confirmDelete = async () => {
        if (!pendingDelete) return;
        const { serviceId } = pendingDelete;

        try {
            await deleteService(serviceId);
        } catch (err) {
            throw new Error(describeError(err));
        }

        setRows(
            (current) =>
                current?.filter((row) => row.summary.serviceId !== serviceId) ??
                null,
        );
        setSelectedService((current) =>
            current?.serviceId === serviceId ? null : current,
        );
        setShowDeleted(true);
    };

    if (error === NOT_SIGNED_IN) {
        return <div className="min-h-screen bg-surface" />;
    }

    const isDetailOpen = selectedService !== null;

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
                        <Link
                            href="/profile/view"
                            aria-label="Back to your profile"
                            className="pr-4"
                        >
                            ←
                        </Link>
                        My Services
                    </h1>
                    <hr className="w-full shrink-0 border-0 border-t border-brand/50" />
                </div>

                {/* Add Service sits above the list, as Add Job does on My Jobs. */}
                <div
                    className={`flex w-[56.56vw] justify-end ${
                        isDetailOpen ? 'ml-[2vw]' : ''
                    }`}
                >
                    <Button
                        onClick={() => router.push('/services/create')}
                        className="flex h-[4.17vh] w-[8.96vw] items-center justify-center gap-[0.42vw]"
                    >
                        <FilePlus size={18} aria-hidden="true" />
                        Add Service
                    </Button>
                </div>

                <div
                    className={`flex items-start transition-all duration-300 ${
                        isDetailOpen ? 'ml-[2vw] gap-[1.5vw]' : ''
                    }`}
                >
                    <div className="flex h-[72.63vh] w-[56.56vw] flex-col">
                        <div className="min-h-0 flex-1 overflow-y-auto pr-[0.63vw]">
                            {error ? (
                                <p
                                    role="alert"
                                    className="py-20 text-center type-sm text-danger"
                                >
                                    {error}
                                </p>
                            ) : rows === null ? (
                                <div className="flex flex-col gap-4 pt-[1vh] pl-[0.5vw]">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="h-32 w-full animate-pulse rounded-[20px] bg-line/60"
                                        />
                                    ))}
                                </div>
                            ) : rows.length === 0 ? (
                                <EmptyState
                                    title="No services yet"
                                    message="Add one so other companies can find what you offer."
                                />
                            ) : (
                                <div className="flex flex-col gap-4 pt-[1vh] pl-[0.5vw]">
                                    {visibleRows.map(({ summary, closed }) => (
                                        <CompanyServiceCard
                                            key={summary.serviceId}
                                            service={summary}
                                            closed={closed}
                                            isSelected={
                                                selectedService?.serviceId ===
                                                summary.serviceId
                                            }
                                            onViewDetail={setSelectedService}
                                            onEdit={editService}
                                            onDelete={setPendingDelete}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <Pagination
                            pagination={
                                rows === null
                                    ? null
                                    : {
                                          page: currentPage,
                                          pageSize: COMPANY_SERVICES_PAGE_SIZE,
                                          totalItems,
                                          totalPages,
                                      }
                            }
                            onPageChange={setPage}
                            ariaLabel="My services pages"
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
                                onEdit={editService}
                                onDelete={setPendingDelete}
                            />
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={pendingDelete !== null}
                onClose={() => setPendingDelete(null)}
                onConfirm={confirmDelete}
                title="Delete this service listing?"
                description={`${pendingDelete?.listingTitle || 'This service'} will be removed and Receivers will no longer see it in search results. This can't be undone.`}
                confirmLabel="Delete listing"
                pendingLabel="Deleting..."
            />

            <SuccessModal
                isOpen={showDeleted}
                onClose={() => setShowDeleted(false)}
                title="Service deleted"
            />
        </main>
    );
}
