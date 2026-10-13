'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { ServicePortfolio } from '@mangodb/shared';
import { ExternalLink, X } from 'lucide-react';
import { portfolioImageSrc } from '@/components/portfolio/portfolioImage';
import CompanyAvatar from '@/components/viewprofile/CompanyAvatar';
import { getPortfoliosByListing } from '@/lib/portfolios';
import {
    formatServiceBudgetRange,
    type ServiceSummary,
} from '@/lib/searchServices';

const portfolioDateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
});

function formatPortfolioDate(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) return date;

    return portfolioDateFormatter.format(
        new Date(Date.UTC(year, month - 1, day)),
    );
}

export function ServiceDetailPanel({
    service,
    onClose,
}: {
    service: ServiceSummary;
    onClose: () => void;
}) {
    const [portfolios, setPortfolios] = useState<ServicePortfolio[] | null>(
        null,
    );
    const [portfolioError, setPortfolioError] = useState(false);

    useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [onClose]);

    useEffect(() => {
        let active = true;

        void getPortfoliosByListing(service.listingId)
            .then((items) => {
                if (active) setPortfolios(items);
            })
            .catch(() => {
                if (active) setPortfolioError(true);
            });

        return () => {
            active = false;
        };
    }, [service.listingId]);

    return (
        <div
            className="
                flex
                h-[72.63vh]
                w-[34vw]
                flex-col
                rounded-popup
                bg-surface-white
                px-[1.5vw]
                py-[2.5vh]
                text-left
                shadow-[0_0_8px_rgba(73,123,147,0.25)]
            "
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-[0.8vh]">
                    <span className="type-sm text-brand">Service Detail</span>

                    <h2 className="type-lg !font-[700] text-ink">
                        {service.listingTitle || '-'}
                    </h2>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close service detail"
                    className="rounded-full p-2 transition hover:bg-fill-subtle"
                >
                    <X size={22} />
                </button>
            </div>

            <hr className="my-[2vh] border-0 border-t border-brand/30" />

            {/* Service Detail */}
            <div className="flex flex-1 flex-col overflow-y-auto pr-[0.5vw]">
                {/* Company */}
                <div className="flex flex-col gap-[0.6vh]">
                    <span className="type-sm text-brand">Company</span>

                    <div className="flex items-center gap-3 pl-[0.5vw]">
                        <CompanyAvatar
                            name={service.company.companyName}
                            photoUrl={service.company.companyPhoto}
                            size={44}
                        />
                        <p className="type-md text-ink">
                            {service.company.companyName || '-'}
                        </p>
                    </div>
                </div>

                {/* Categories */}
                <div className="mt-[2vh] flex flex-col gap-[0.8vh]">
                    <span className="type-sm text-brand">Categories</span>

                    <div className="flex flex-wrap gap-[0.42vw] pl-[0.5vw]">
                        {service.categories.length > 0 ? (
                            service.categories.map((category) => (
                                <span
                                    key={category}
                                    className="
                                        rounded-status
                                        bg-accent
                                        px-[0.63vw]
                                        py-[0.19vh]
                                        type-sm
                                        !font-[600]
                                        text-ink
                                    "
                                >
                                    {category}
                                </span>
                            ))
                        ) : (
                            <span className="type-sm text-ink-soft">-</span>
                        )}
                    </div>
                </div>

                {/* Description */}
                <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                    <span className="type-sm text-brand">Description</span>

                    <p className="type-sm leading-relaxed whitespace-pre-wrap text-ink pl-[0.5vw]">
                        {service.listingDesc || '-'}
                    </p>
                </div>

                {/* Budget */}
                <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                    <span className="type-sm text-brand">Budget</span>

                    <p className="type-md text-ink pl-[0.5vw]">
                        {formatServiceBudgetRange(
                            service.minBudget,
                            service.maxBudget,
                        )}
                    </p>
                </div>

                {/* Tech Stack */}
                <div className="mt-[2vh] flex flex-col gap-[0.8vh]">
                    <span className="type-sm text-brand">Tech Stack</span>

                    <div className="flex flex-wrap gap-[0.42vw] pl-[0.5vw]">
                        {service.techStack.length > 0 ? (
                            service.techStack.map((technology) => (
                                <span
                                    key={technology}
                                    className="
                                        rounded-status
                                        bg-accent
                                        px-[0.63vw]
                                        py-[0.19vh]
                                        type-sm
                                        !font-[600]
                                        text-ink
                                    "
                                >
                                    {technology}
                                </span>
                            ))
                        ) : (
                            <span className="type-sm text-ink-soft">-</span>
                        )}
                    </div>
                </div>

                {/* Portfolio */}
                <div className="mt-[2vh] flex flex-col gap-[0.8vh]">
                    <span className="type-sm text-brand">Portfolio</span>

                    {portfolios === null && !portfolioError && (
                        <p
                            role="status"
                            className="type-sm text-ink-soft pl-[0.5vw]"
                        >
                            Loading portfolio…
                        </p>
                    )}

                    {portfolioError && (
                        <p
                            role="alert"
                            className="type-sm text-danger pl-[0.5vw]"
                        >
                            Portfolio could not be loaded.
                        </p>
                    )}

                    {portfolios?.length === 0 && (
                        <p className="type-sm text-ink-soft pl-[0.5vw]">
                            No portfolio provided.
                        </p>
                    )}

                    {portfolios && portfolios.length > 0 && (
                        <div className="flex flex-col gap-3 pl-[0.5vw]">
                            {portfolios.map((portfolio) => (
                                <article
                                    key={portfolio.portfolioId}
                                    className="rounded-input grid grid-cols-[88px_minmax(0,1fr)] gap-3 border border-line bg-surface-white p-3"
                                >
                                    <div className="relative h-[66px] overflow-hidden rounded-input bg-fill-subtle">
                                        <Image
                                            src={portfolioImageSrc(
                                                portfolio.portfolioImage,
                                            )}
                                            alt=""
                                            fill
                                            sizes="88px"
                                            className="object-cover"
                                        />
                                    </div>

                                    <div className="min-w-0">
                                        <a
                                            href={portfolio.portfolioLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex max-w-full items-center gap-1 type-sm !font-[600] text-ink hover:text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                                        >
                                            <span className="truncate">
                                                {portfolio.portfolioName}
                                            </span>
                                            <ExternalLink
                                                aria-hidden
                                                className="h-3.5 w-3.5 shrink-0"
                                            />
                                        </a>
                                        <p className="mt-0.5 type-xs text-ink-soft">
                                            {formatPortfolioDate(
                                                portfolio.developmentDate,
                                            )}
                                        </p>
                                        <p className="mt-1 line-clamp-2 type-xs text-ink-soft">
                                            {portfolio.portfolioDescription ||
                                                'No description provided.'}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
