'use client';
import React, { useState } from 'react';

export interface TimelineItem {
    id: number;
    startDate: string;
    endDate: string;
    customer: string;
    project: string;
    rating?: string;
    status?: string;
}

const historyEvents: TimelineItem[] = [
    {
        id: 1,
        startDate: "26 Feb '19",
        endDate: "30 June '22",
        customer: 'Ubuntu',
        project: 'Software Engineering',
        rating: '8.2',
    },
    {
        id: 2,
        startDate: "15 Jan '20",
        endDate: "10 Dec '23",
        customer: 'Uwira',
        project: 'Operating Systems',
        rating: '5.0',
    },
];

const ongoingEvents: TimelineItem[] = [
    {
        id: 3,
        startDate: "12 Mar '24",
        endDate: "30 June '26",
        customer: 'Debian',
        project: 'Cloud Architecture',
        status: 'In Progress',
    },
    {
        id: 4,
        startDate: "01 Aug '25",
        endDate: "15 Nov '26",
        customer: 'Fedora',
        project: 'Security Audit',
        status: 'In Progress',
    },
];

export default function ProjectTimeline() {
    const [activeTab, setActiveTab] = useState<'history' | 'ongoing'>(
        'history',
    );

    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col font-sans">
            {/* Sub Tabs Switcher */}
            <div className="bg-gray-100 p-1 rounded-xl flex w-60 mb-4 text-xs">
                <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                        activeTab === 'history'
                            ? 'bg-white shadow text-[#497B93]'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    History
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('ongoing')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                        activeTab === 'ongoing'
                            ? 'bg-white shadow text-[#497B93]'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Ongoing Project
                </button>
            </div>

            {/* Single Visible Container */}
            <div className="bg-gray-100/60 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-gray-800 capitalize">
                        {activeTab === 'history'
                            ? 'Project History'
                            : 'Ongoing Projects'}
                    </h3>
                    <button className="text-[11px] bg-white border border-gray-200 px-3 py-1 rounded-lg text-gray-600 shadow-sm flex items-center gap-1">
                        ▲ Sort by Date
                    </button>
                </div>

                {/* Timeline Feed - Shows History OR Ongoing based on activeTab */}
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-[2px] before:bg-slate-300">
                    {activeTab === 'history' &&
                        historyEvents.map((item) => (
                            <div
                                key={item.id}
                                className="relative flex items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-xs justify-between"
                            >
                                {/* Timeline Node Point */}
                                <span className="absolute -left-6 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#497B93]"></span>

                                <div className="flex gap-4 items-center">
                                    <div>
                                        <div className="font-semibold text-gray-800">
                                            {item.startDate}
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            Start Date
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-800">
                                            {item.endDate}
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            End Date
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-400">
                                            Customer
                                        </div>
                                        <div className="font-medium text-gray-700">
                                            {item.customer}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-400">
                                            Project Name
                                        </div>
                                        <div className="font-medium text-gray-700">
                                            {item.project}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-[10px] text-gray-400">
                                            Rating
                                        </div>
                                        <div className="font-bold text-gray-800">
                                            {item.rating}
                                        </div>
                                    </div>
                                    <button className="text-[#497B93] hover:underline">
                                        Details
                                    </button>
                                </div>
                            </div>
                        ))}

                    {activeTab === 'ongoing' &&
                        ongoingEvents.map((item) => (
                            <div
                                key={item.id}
                                className="relative flex items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-xs justify-between"
                            >
                                {/* Timeline Node Point */}
                                <span className="absolute -left-6 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#497B93]"></span>

                                <div className="flex gap-4 items-center">
                                    <div>
                                        <div className="font-semibold text-gray-800">
                                            {item.startDate}
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            Start Date
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-800">
                                            {item.endDate}
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            Est. End Date
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-400">
                                            Customer
                                        </div>
                                        <div className="font-medium text-gray-700">
                                            {item.customer}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-400">
                                            Project Name
                                        </div>
                                        <div className="font-medium text-gray-700">
                                            {item.project}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] text-[#497B93] bg-[#497B93]/10 font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                                        {item.status || 'Active'}
                                    </span>
                                    <button className="text-[#497B93] hover:underline">
                                        Details
                                    </button>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
