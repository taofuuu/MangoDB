import React from 'react';
import type { ServicePortfolio } from '@mangodb/shared';
import Image from 'next/image';
import PortfolioDots from '@/components/portfolios/PortfolioDots';
import { portfolioImageSrc } from '@/components/portfolios/portfolioImage';

interface OtherCompanyPortfolioCardProps {
    item: ServicePortfolio;
}

export function OtherCompanyPortfolioCard({
    item,
}: OtherCompanyPortfolioCardProps) {
    const src = portfolioImageSrc(item.portfolioImage);

    return (
        <div className="flex h-full flex-col rounded-[10px] border border-line bg-surface-white p-3 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:shadow-md">
            <h3 className="line-clamp-1 type-sm !font-[700] text-ink">
                {item.portfolioLink ? (
                    <a
                        href={item.portfolioLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-brand hover:underline"
                    >
                        {item.portfolioName}
                    </a>
                ) : (
                    item.portfolioName
                )}
            </h3>

            {item.portfolioDescription && (
                <p className="mt-0.5 line-clamp-1 type-xs text-ink-soft">
                    {item.portfolioDescription}
                </p>
            )}

            <div className="relative mt-2 h-[120px] w-full overflow-hidden rounded-[8px] bg-fill-subtle">
                <Image
                    src={src}
                    alt={item.portfolioName}
                    fill
                    sizes="180px"
                    className="object-cover"
                />
            </div>

            <div className="mt-auto flex items-center justify-end pt-3">
                <PortfolioDots />
            </div>
        </div>
    );
}
