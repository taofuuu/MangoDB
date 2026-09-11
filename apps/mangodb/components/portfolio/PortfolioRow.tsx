'use client';

import Image from 'next/image';
import type { ServicePortfolio } from '@mangodb/shared';
import PortfolioDots from './PortfolioDots';
import { portfolioImageSrc } from './portfolioImage';

type PortfolioRowProps = {
    item: ServicePortfolio;
    onDelete: (item: ServicePortfolio) => void;
};

export default function PortfolioRow({ item, onDelete }: PortfolioRowProps) {
    return (
        <div className="relative flex w-full items-center gap-[1.25vw] rounded-[2px] border border-[#EAEAEA] bg-white p-[1.2vh] text-left shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-md">
            {/* Covers the row so any spot but Delete opens it. z-10 keeps it
                above the image, which is positioned and would swallow clicks.
                An anchor, not a button: middle-click, copy link and screen
                readers all expect a link for an external URL. */}
            <a
                href={item.portfolio_link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${item.portfolio_name}`}
                className="absolute inset-0 z-10 rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3F6B80]"
            />

            <div className="relative h-[9.26vh] w-[9.9vw] shrink-0 overflow-hidden rounded-[4px]">
                <Image
                    src={portfolioImageSrc(item.portfolio_image)}
                    alt=""
                    fill
                    sizes="10vw"
                    className="object-cover"
                />
            </div>

            <div className="min-w-0">
                <h2 className="text-lg leading-tight !font-[700] text-[#171717]">
                    {item.portfolio_name}
                </h2>

                <p className="mt-[0.3vh] text-md leading-snug !font-[400] text-[#757575]">
                    {item.portfolio_description}
                </p>
            </div>

            {/* ml-auto pushes the footer to the far right of the row */}
            <div className="ml-auto flex items-center gap-[1.25vw] pr-[1vw]">
                {/* z-20 lifts Delete above the overlay so it stays clickable */}
                <button
                    type="button"
                    onClick={() => onDelete(item)}
                    className="relative z-20 text-sm !font-[600] text-[#C5483E] transition-colors hover:text-[#B93D35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5483E]"
                >
                    Delete
                </button>

                <PortfolioDots />
            </div>
        </div>
    );
}
