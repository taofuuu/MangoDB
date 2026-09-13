'use client';

import Image from 'next/image';
import type { ServicePortfolio } from '@mangodb/shared';
import PortfolioDots from './PortfolioDots';
import { portfolioImageSrc } from './portfolioImage';

type PortfolioRowProps = {
    item: ServicePortfolio;
    onEdit: (item: ServicePortfolio) => void;
    onDelete: (item: ServicePortfolio) => void;
};

export default function PortfolioRow({
    item,
    onEdit,
    onDelete,
}: PortfolioRowProps) {
    return (
        <div className="relative flex w-full items-center gap-[1.25vw] rounded-[2px] border border-line-softer bg-white p-[1.2vh] text-left shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-md">
            {/* Covers the row so any spot but Edit or Delete opens it. z-10
                keeps it above the image, which is positioned and would
                swallow clicks. An anchor, not a button: middle-click, copy
                link and screen readers all expect a link for an external URL. */}
            <a
                href={item.portfolioLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${item.portfolioName}`}
                className="absolute inset-0 z-10 rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
            />

            <div className="relative h-[9.26vh] w-[9.9vw] shrink-0 overflow-hidden rounded-[4px]">
                <Image
                    src={portfolioImageSrc(item.portfolioImage)}
                    alt=""
                    fill
                    sizes="10vw"
                    className="object-cover"
                />
            </div>

            <div className="min-w-0">
                <h2 className="type-lg leading-tight !font-[700] text-ink">
                    {item.portfolioName}
                </h2>

                <p className="mt-[0.3vh] type-md leading-snug !font-[400] text-ink-faint">
                    {item.portfolioDescription}
                </p>
            </div>

            {/* ml-auto pushes the footer to the far right of the row */}
            <div className="ml-auto flex items-center gap-[1.25vw] pr-[1vw]">
                {/* z-20 lifts account actions above the row link. */}
                <div className="relative z-20 flex items-center gap-[1vw]">
                    <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="type-sm !font-[600] text-brand transition-colors hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="type-sm !font-[600] text-danger-2 transition-colors hover:text-danger-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-2"
                    >
                        Delete
                    </button>
                </div>

                <PortfolioDots />
            </div>
        </div>
    );
}
