'use client';
import React from 'react';

const portfolioItems = [
    { id: 1, title: 'Print Hello world', date: '28 June 2026' },
    { id: 2, title: 'Java Project', date: '28 June 2026' },
    { id: 3, title: "Ubuntu's Uwira", date: '28 June 2026' },
    { id: 4, title: '67 Counter Camera', date: '28 June 2026' },
    { id: 5, title: 'C++ Project', date: '28 June 2026' },
    { id: 6, title: 'Autonomous Robot', date: '28 June 2026' },
    { id: 7, title: 'Evil Eye', date: '28 June 2026' },
];

export default function PortfolioList() {
    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Portfolio</h3>

            <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto pr-2">
                {portfolioItems.map((item) => (
                    <div
                        key={item.id}
                        className="py-2 flex justify-between items-center text-xs"
                    >
                        <span className="font-medium text-gray-700">
                            {item.title}
                        </span>
                        <div className="flex items-center gap-6">
                            <span className="text-gray-400 text-[11px]">
                                {item.date}
                            </span>
                            <button className="text-sky-600 hover:underline">
                                Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
