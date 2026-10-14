import React, { useEffect, useState } from 'react';
import type {
    ServiceListing,
    ServicePortfolio,
    ServiceSummary,
} from '@mangodb/shared';
import { Tag } from 'lucide-react';
import { listServicePortfolios } from '@/lib/portfolios';
import { OtherCompanyPortfolioCard } from './OtherCompanyPortfolioCard';

interface OtherCompanyServiceDetailPanelProps {
    service: ServiceListing | ServiceSummary;
}

export function OtherCompanyServiceDetailPanel({
    service,
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
        <div className="flex h-full max-h-[80vh] flex-col rounded-[24px] border border-line bg-surface-white pl-6 pt-6 pb-6 shadow-sm overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-5">
                {/* Header section with icon + title + category + budgets */}
                <div className="flex items-start gap-4">
                    {/* Briefcase Icon */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] text-[#497B93]">
                        <svg
                            className="h-12 w-12"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
                        </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h2 className="type-lg !font-[700]  break-words">
                            {service.listingTitle}
                        </h2>

                        {categories.length > 0 && (
                            <p className="type-xs -soft mt-0.5">
                                {categories.join(', ')}
                            </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-6">
                            {/* Min Budget */}
                            <div className="flex items-center gap-2">
                                <div className="text-[#497B93]">
                                    <Tag className="h-4 w-4 rotate-90" />
                                </div>
                                <div className="text-left">
                                    <span className="block type-xs text-[#497B93] font-medium leading-none">
                                        Min Budget
                                    </span>
                                    <span className="mt-1 block type-xs  font-semibold">
                                        {service.minBudget != null
                                            ? `${service.minBudget.toLocaleString('en-US')} baht`
                                            : '-'}
                                    </span>
                                </div>
                            </div>

                            {/* Max Budget */}
                            <div className="flex items-center gap-2">
                                <div className="text-[#497B93]">
                                    <Tag className="h-4 w-4 rotate-90" />
                                </div>
                                <div className="text-left">
                                    <span className="block type-xs text-[#497B93] font-medium leading-none">
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
                <hr className="border-0 border-t border-brand/30" />
                {/* Tech Stacks section */}
                {techStack.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="type-sm !font-[700] ">Tech Stacks</h3>
                        <div className="flex flex-wrap gap-2">
                            {techStack.map((tech) => (
                                <span
                                    key={tech}
                                    className="rounded-full border border-line bg-[#F3F4F6] px-3 py-1 type-xs "
                                >
                                    {tech}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {/* Description section */}
                <div className="space-y-2">
                    <h3 className="type-sm !font-[700] ">Description</h3>
                    <p className="type-sm -soft leading-relaxed whitespace-pre-line">
                        {service.listingDesc || 'No description provided.'}
                    </p>
                </div>
                {/* Portfolio section */}
                <div className="space-y-3 pt-2">
                    <h3 className="type-sm !font-[700] ">Portfolio</h3>

                    {portfolios === null && !portfolioError && (
                        <p className="type-xs -soft">Loading portfolio...</p>
                    )}

                    {portfolioError && (
                        <p className="type-xs text-danger">
                            Failed to load portfolio.
                        </p>
                    )}

                    {portfolios && portfolios.length === 0 && (
                        <p className="type-xs -soft">
                            No portfolio items available for this service.
                        </p>
                    )}

                    {portfolios && portfolios.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {portfolios.map((item) => (
                                <OtherCompanyPortfolioCard
                                    key={item.portfolioId}
                                    item={item}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
