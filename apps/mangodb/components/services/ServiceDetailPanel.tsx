'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ServicePortfolio } from '@mangodb/shared';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { portfolioImageSrc } from '@/components/portfolios/portfolioImage';
import CompanyAvatar from '@/components/companies/CompanyAvatar';
import { formatDateOnly } from '@/lib/dates';
import { formatBudgetRange } from '@/lib/money';
import { listPortfolios } from '@/lib/portfolios';
import type { ServiceSummary } from '@mangodb/shared';

export default function ServiceDetailPanel({
    service,
    onClose,
    titleId,
}: {
    service: ServiceSummary;
    onClose: () => void;
    // Set when the panel sits in a dialog, so the dialog can name itself by
    // the heading (aria-labelledby). The search page's side panel needs none.
    titleId?: string;
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

        void listPortfolios({ serviceId: service.serviceId })
            .then((items) => {
                if (active) setPortfolios(items);
            })
            .catch(() => {
                if (active) setPortfolioError(true);
            });

        return () => {
            active = false;
        };
    }, [service.serviceId]);

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
                shadow-[0_0_8px_color-mix(in_srgb,var(--color-brand)_25%,transparent)]
            "
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-[0.8vh]">
                    <span className="type-sm text-brand">Service Detail</span>

                    <h2 id={titleId} className="type-lg !font-[700] text-ink">
                        {service.listingTitle || '-'}
                    </h2>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close service detail"
                    className="rounded-full p-2 transition hover:bg-fill-subtle"
                >
                    <ArrowLeft size={22} />
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
                        <Link
                            href={`/companies/${service.company.companyId}`}
                            className="type-md text-ink hover:underline"
                        >
                            {service.company.companyName || '-'}
                        </Link>
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
                        {formatBudgetRange(
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
                                            {formatDateOnly(
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
