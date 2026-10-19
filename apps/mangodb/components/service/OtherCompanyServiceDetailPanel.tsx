'use client';

import { useEffect, useState } from 'react';
import type {
    ServiceListing,
    ServicePortfolio,
    ServiceSummary,
} from '@mangodb/shared';
import { Tag } from 'lucide-react';

import { listServicePortfolios } from '@/lib/portfolios';
import { OtherCompanyPortfolioCard } from './OtherCompanyPortfolioCard';
import ServiceActionsMenu from './ServiceActionsMenu';

type ServiceItem = ServiceListing | ServiceSummary;

interface OtherCompanyServiceDetailPanelProps {
    service: ServiceItem;
    onEdit?: ((service: ServiceItem) => void) | undefined;
    onDelete?: ((service: ServiceItem) => void) | undefined;
    onToggleStatus?: ((service: ServiceItem) => void) | undefined;
    isOpen?: boolean | undefined;
}

export function OtherCompanyServiceDetailPanel({
    service,
    onEdit,
    onDelete,
    onToggleStatus,
    // isOpen = true,
}: OtherCompanyServiceDetailPanelProps) {
    const [portfolios, setPortfolios] = useState<ServicePortfolio[] | null>(
        null,
    );
    const [portfolioError, setPortfolioError] = useState(false);

    useEffect(() => {
        let active = true;

        void listServicePortfolios(service.serviceId)
            .then((data) => {
                if (active) {
                    setPortfolios(data);
                    setPortfolioError(false);
                }
            })
            .catch(() => {
                if (active) {
                    setPortfolioError(true);
                }
            });

        return () => {
            active = false;
        };
    }, [service.serviceId]);

    const categories =
        'categories' in service && Array.isArray(service.categories)
            ? service.categories
            : [];

    const techStack = service.techStack ?? [];

    return (
        <div className="flex h-full max-h-[80vh] flex-col overflow-hidden rounded-[24px] border border-line bg-surface-white py-6 pl-6 shadow-sm">
            <div className="flex-1 space-y-5 overflow-y-auto">
                {/* Header: icon, title, categories, budget, and actions */}
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] text-brand">
                        <svg
                            className="h-12 w-12"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
                        </svg>
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                            <h2 className="type-lg break-words !font-[700]">
                                {service.listingTitle}
                            </h2>

                            <div className="shrink-0 mr-6">
                                {(onEdit || onDelete || onToggleStatus) && (
                                    <ServiceActionsMenu
                                        service={service}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        // onToggleStatus={onToggleStatus}
                                        // isOpen={isOpen}
                                    />
                                )}
                            </div>
                        </div>

                        {categories.length > 0 && (
                            <p className="mt-0.5 type-xs text-ink-soft">
                                {categories.join(', ')}
                            </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="text-brand">
                                    <Tag className="h-4 w-4 rotate-90" />
                                </div>
                                <div className="text-left">
                                    <span className="block type-xs font-medium leading-none text-brand">
                                        Min Budget
                                    </span>
                                    <span className="mt-1 block type-xs font-semibold">
                                        {service.minBudget != null
                                            ? `${service.minBudget.toLocaleString('en-US')} baht`
                                            : '-'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="text-brand">
                                    <Tag className="h-4 w-4 rotate-90" />
                                </div>
                                <div className="text-left">
                                    <span className="block type-xs font-medium leading-none text-brand">
                                        Max Budget
                                    </span>
                                    <span className="mt-1 block type-xs font-semibold">
                                        {service.maxBudget != null
                                            ? `${service.maxBudget.toLocaleString('en-US')} baht`
                                            : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="mr-6 border-0 border-t border-brand/30" />

                {/* Tech stacks */}
                {techStack.length > 0 && (
                    <section className="space-y-2">
                        <h3 className="type-sm !font-[700]">Tech Stacks</h3>
                        <div className="flex flex-wrap gap-2">
                            {techStack.map((tech) => (
                                <span
                                    key={tech}
                                    className="rounded-full border border-line bg-fill-subtle px-3 py-1 type-xs text-ink-soft"
                                >
                                    {tech}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {/* Description */}
                <section className="space-y-2">
                    <h3 className="type-sm !font-[700]">Description</h3>
                    <p className="whitespace-pre-line type-sm leading-relaxed text-ink-soft">
                        {service.listingDesc || 'No description provided.'}
                    </p>
                </section>

                {/* Portfolio */}
                <section className="space-y-3 pt-2">
                    <h3 className="type-sm !font-[700]">Portfolio</h3>

                    {portfolios === null && !portfolioError && (
                        <p className="type-xs text-ink-soft">
                            Loading portfolio...
                        </p>
                    )}

                    {portfolioError && (
                        <p className="type-xs text-danger">
                            Failed to load portfolio.
                        </p>
                    )}

                    {portfolios !== null && portfolios.length === 0 && (
                        <p className="type-xs text-ink-soft">
                            No portfolio items available for this service.
                        </p>
                    )}

                    {portfolios !== null && portfolios.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                            {portfolios.map((item) => (
                                <OtherCompanyPortfolioCard
                                    key={item.portfolioId}
                                    item={item}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
