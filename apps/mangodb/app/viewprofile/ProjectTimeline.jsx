'use client';
import React from 'react';

const timelineEvents = [
    {
        id: 1,
        startDate: "26 Feb '19",
        endDate: "30 June '26",
        customer: 'Ubuntu',
        project: 'Software Engineering',
        rating: '8.2',
    },
    {
        id: 2,
        startDate: "26 Feb '19",
        endDate: "30 June '26",
        customer: 'Uwira',
        project: 'Operating Systems',
        rating: '5.0',
    },
];

export default function ProjectTimeline() {
    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col">
            {/* Sub Tabs */}
            <div className="bg-gray-100 p-1 rounded-xl flex w-60 mb-4 text-xs">
                <button className="flex-1 py-1.5 rounded-lg font-medium bg-white shadow text-sky-600">
                    History
                </button>
                <button className="flex-1 py-1.5 rounded-lg font-medium text-gray-500">
                    Ongoing Project
                </button>
            </div>

            {/* Main Container */}
            <div className="bg-gray-100/60 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-gray-800">
                        Project timeline
                    </h3>
                    <button className="text-[11px] bg-white border border-gray-200 px-3 py-1 rounded-lg text-gray-600 shadow-sm flex items-center gap-1">
                        ▲ Sort by Date
                    </button>
                </div>

                {/* Timeline Items Feed */}
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-[2px] before:bg-slate-300">
                    {timelineEvents.map((item) => (
                        <div
                            key={item.id}
                            className="relative flex items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-xs justify-between"
                        >
                            {/* Timeline Node Point */}
                            <span className="absolute -left-6 w-2.5 h-2.5 rounded-full bg-white border-2 border-sky-500"></span>

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
                                <button className="text-sky-600 hover:underline">
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
