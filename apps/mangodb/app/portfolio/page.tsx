'use client';

import { useState } from 'react';
import CategoryFilter from '@/components/portfolio/CategoryFilter';
import PortfolioCard, {
    PortfolioItem,
} from '@/components/portfolio/PortfolioCard';
import PortfolioRow from '@/components/portfolio/PortfolioRow';
import ViewToggle, { PortfolioView } from '@/components/portfolio/ViewToggle';

// Mock data - there is no portfolio endpoint on the API yet.
const PORTFOLIO_ITEMS: PortfolioItem[] = [
    {
        id: 1,
        title: 'Robot Development',
        subtitle: 'AI Robot & AI Machine Learning',
        category: 'Robotics',
        image: '/portfolio-placeholder.svg',
    },
    {
        id: 2,
        title: 'Robot Development',
        subtitle: 'AI Robot & AI Machine Learning',
        category: 'Robotics',
        image: '/portfolio-placeholder.svg',
    },
    {
        id: 3,
        title: 'Robot Development',
        subtitle: 'AI Robot & AI Machine Learning',
        category: 'AI',
        image: '/portfolio-placeholder.svg',
    },
    {
        id: 4,
        title: 'Robot Development',
        subtitle: 'AI Robot & AI Machine Learning',
        category: 'AI',
        image: '/portfolio-placeholder.svg',
    },
    {
        id: 5,
        title: 'Robot Development',
        subtitle: 'AI Robot & AI Machine Learning',
        category: 'Software',
        image: '/portfolio-placeholder.svg',
    },
];

const CATEGORIES = ['ALL', 'Robotics', 'AI', 'Software'];

export default function PortfolioPage() {
    const [view, setView] = useState<PortfolioView>('grid');
    const [category, setCategory] = useState('ALL');

    const visible =
        category === 'ALL'
            ? PORTFOLIO_ITEMS
            : PORTFOLIO_ITEMS.filter((item) => item.category === category);

    // Dummy handlers - wire these to the API once the endpoints exist.
    const handleAdd = () => {
        console.log('Add portfolio');
    };

    const handleOpen = (item: PortfolioItem) => {
        console.log('Open portfolio', item.id);
    };

    return (
        <main className="min-h-screen bg-[#FFFDF9] px-[8.13vw] pt-[7.5vh] pb-[7.5vh] text-[#171717] max-md:px-[5vw]">
            <div className="flex items-start justify-between gap-[2vw] max-md:flex-col max-md:gap-[2vh]">
                <div>
                    <h1 className="text-hd !text-[48px] leading-none">
                        Portfolio
                    </h1>

                    <p className="mt-[1vh] text-lg !font-[400]">
                        List of company&apos;s portfolio
                    </p>
                </div>

                <div className="flex items-center gap-[1.2vw] max-md:w-full max-md:flex-wrap max-md:gap-3">
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="h-[4.17vh] min-h-[36px] rounded-button bg-[#497B93] px-[1.2vw] text-sm !font-[600] text-white transition-colors hover:bg-[#3F6B80] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3F6B80]"
                    >
                        + Add Portfolio
                    </button>

                    <CategoryFilter
                        value={category}
                        onChange={setCategory}
                        options={CATEGORIES}
                    />

                    <ViewToggle value={view} onChange={setView} />
                </div>
            </div>

            {visible.length === 0 && (
                <p className="mt-[4.5vh] text-md !font-[400] text-[#757575]">
                    No portfolio in this category yet.
                </p>
            )}

            {view === 'grid' && (
                <div className="mt-[4.5vh] grid grid-cols-4 gap-x-[3.49vw] gap-y-[3.7vh] max-lg:grid-cols-2 max-sm:grid-cols-1">
                    {visible.map((item) => (
                        <PortfolioCard
                            key={item.id}
                            item={item}
                            onClick={handleOpen}
                        />
                    ))}
                </div>
            )}

            {view === 'list' && (
                <div className="mt-[4.5vh] flex flex-col gap-[2vh]">
                    {visible.map((item) => (
                        <PortfolioRow
                            key={item.id}
                            item={item}
                            onClick={handleOpen}
                        />
                    ))}
                </div>
            )}
        </main>
    );
}
