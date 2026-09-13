'use client';

import Image from 'next/image';
import type { ServicePortfolio } from '@mangodb/shared';
import PortfolioDots from './PortfolioDots';
import { portfolioImageSrc } from './portfolioImage';

type PortfolioCardProps = {
    item: ServicePortfolio;
    onEdit: (item: ServicePortfolio) => void;
    onDelete: (item: ServicePortfolio) => void;
};

export default function PortfolioCard({
    item,
    onEdit,
    onDelete,
}: PortfolioCardProps) {
    return (
        <div className="relative flex h-[37.13vh] flex-col rounded-[2px] border border-line-softer bg-white px-[1.25vw] pt-[3.7vh] pb-[2.5vh] text-left shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-md max-lg:h-auto max-lg:w-full max-lg:px-4">
            {/* Covers the card so any spot but Edit or Delete opens it. z-10
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

            <h2 className="type-lg leading-tight !font-[700] text-ink">
                {item.portfolioName}
            </h2>

            <p className="mt-[0.3vh] type-md leading-snug !font-[400] text-ink-faint">
                {item.portfolioDescription}
            </p>

            {/* Fixed height so every card lines its image up at the same spot */}
            <div className="relative mx-[1.88vw] mt-[2.2vh] h-[16.39vh] overflow-hidden rounded-[4px] max-lg:mx-0 max-lg:h-[22vh]">
                <Image
                    src={portfolioImageSrc(item.portfolioImage)}
                    alt=""
                    fill
                    sizes="19vw"
                    className="object-cover"
                />
            </div>

            {/* mt-auto pins the footer to the bottom of the card */}
            <div className="mt-auto flex items-center justify-between pt-[2vh] pr-[1vw]">
                {/* z-20 lifts account actions above the card link. */}
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
