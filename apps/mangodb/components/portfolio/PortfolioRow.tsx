'use client';

import Image from 'next/image';
import type { PortfolioItem } from './PortfolioCard';
import PortfolioDots from './PortfolioDots';

type PortfolioRowProps = {
    item: PortfolioItem;
    onClick: (item: PortfolioItem) => void;
};

export default function PortfolioRow({ item, onClick }: PortfolioRowProps) {
    return (
        <button
            type="button"
            onClick={() => onClick(item)}
            className="flex w-full items-center gap-[1.25vw] rounded-[2px] border border-[#EAEAEA] bg-white p-[1.2vh] text-left shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3F6B80]"
        >
            <div className="relative h-[9.26vh] w-[9.9vw] shrink-0 overflow-hidden rounded-[4px]">
                <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="10vw"
                    className="object-cover"
                />
            </div>

            <div className="min-w-0">
                <h2 className="text-lg leading-tight !font-[700] text-[#171717]">
                    {item.title}
                </h2>

                <p className="mt-[0.3vh] text-md leading-snug !font-[400] text-[#757575]">
                    {item.subtitle}
                </p>
            </div>

            {/* ml-auto pushes the dots to the far right of the row */}
            <div className="ml-auto pr-[1vw]">
                <PortfolioDots />
            </div>
        </button>
    );
}
