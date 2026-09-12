'use client';
import React, { useState } from 'react';

export interface ListItem {
    id: number;
    title: string;
    date: string;
}

const portfolioItems: ListItem[] = [
    { id: 1, title: 'Print Hello world', date: '28 June 2026' },
    { id: 2, title: 'Java Project', date: '28 June 2026' },
    { id: 3, title: "Ubuntu's Uwira", date: '28 June 2026' },
    { id: 4, title: '67 Counter Camera', date: '28 June 2026' },
    { id: 5, title: 'C++ Project', date: '28 June 2026' },
    { id: 6, title: 'Autonomous Robot', date: '28 June 2026' },
    { id: 7, title: 'Evil Eye', date: '28 June 2026' },
];

const certificateItems: ListItem[] = [
    { id: 1, title: 'AWS Cloud Practitioner', date: '15 Jan 2026' },
    { id: 2, title: 'Certified Kubernetes Administrator', date: '10 Feb 2026' },
    { id: 3, title: 'Meta Front-End Developer', date: '01 Mar 2026' },
    { id: 4, title: 'Cybersecurity Fundamentals', date: '12 Apr 2026' },
];

export default function PortfolioCertificateList() {
    const [activeTab, setActiveTab] = useState<'portfolio' | 'certificates'>(
        'portfolio',
    );

    const currentItems =
        activeTab === 'portfolio' ? portfolioItems : certificateItems;

    return (
        <div className="bg-white rounded-button p-5 border border-gray-200 shadow-sm font-sans">
            {/* Tab Switcher */}
            <div className="bg-gray-100 p-1 rounded-button flex w-60 mb-4 text-xs">
                <button
                    type="button"
                    onClick={() => setActiveTab('portfolio')}
                    className={`flex-1 py-1.5 rounded-button font-medium transition ${
                        activeTab === 'portfolio'
                            ? 'bg-white shadow text-[#497B93]'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Portfolio
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('certificates')}
                    className={`flex-1 py-1.5 rounded-button font-medium transition ${
                        activeTab === 'certificates'
                            ? 'bg-white shadow text-[#497B93]'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Certificate
                </button>
            </div>

            {/* Title Header */}
            <h3 className="text-sm !font-bold text-gray-800 mb-3 capitalize">
                {activeTab === 'portfolio' ? 'Portfolio' : 'Certificates'}
            </h3>

            {/* List Display */}
            <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto pr-2">
                {currentItems.map((item) => (
                    <div
                        key={item.id}
                        className="py-2 flex justify-between items-center text-xs"
                    >
                        <span className="font-medium text-gray-700">
                            {item.title}
                        </span>
                        <div className="flex items-center gap-6">
                            <span className="text-gray-400 text-xs">
                                {item.date}
                            </span>
                            <button className="text-[#497B93] hover:underline">
                                Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
