'use client';

import Image from 'next/image';
import PortfolioDots from './PortfolioDots';

export type PortfolioItem = {
    id: number;
    title: string;
    subtitle: string;
    category: string;
    image: string;
};

type PortfolioCardProps = {
    item: PortfolioItem;
    onClick: (item: PortfolioItem) => void;
};

export default function PortfolioCard({ item, onClick }: PortfolioCardProps) {
    return (
        <button
            type="button"
            onClick={() => onClick(item)}
            className="flex h-[37.13vh] w-[18.23vw] flex-col rounded-[8px] border border-[#EAEAEA] bg-white px-[1.25vw] pt-[2.5vh] pb-[2.5vh] text-left shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3F6B80] max-lg:h-auto max-lg:w-full max-lg:px-4"
        >
            <h2 className="text-lg !font-[700] text-[#171717]">{item.title}</h2>

            <p className="mt-[0.5vh] text-md !font-[400] text-[#757575]">
                {item.subtitle}
            </p>

            {/* Fixed height so every card lines its image up at the same spot */}
            <div className="relative mx-[1.88vw] mt-[2.2vh] h-[16.39vh] overflow-hidden rounded-[8px] max-lg:mx-0 max-lg:h-[22vh]">
                <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="19vw"
                    className="object-cover"
                />
            </div>

            {/* mt-auto pins the dots to the bottom of the card */}
            <div className="mt-auto flex justify-end pt-[2vh] pr-[1vw]">
                <PortfolioDots />
            </div>
        </button>
    );
}
