'use client';

import React from 'react';

export default function JobListing() {
    const mockJobs = [
        {
            id: 1,
            title: 'DevOps & Infrastructure Setup',
            budget: '1,000,000',
            deadline: '30 Aug 2026',
        },
        {
            id: 2,
            title: 'Data Engineering & Pipeline Setup',
            budget: '1,000,000',
            deadline: '30 Aug 2026',
        },
        {
            id: 3,
            title: 'UI/UX Design',
            budget: '1,000,000',
            deadline: '30 Aug 2026',
        },
        {
            id: 4,
            title: 'Cybersecurity Compliance & Auditing',
            budget: '1,000,000',
            deadline: '30 Aug 2026',
        },
        {
            id: 5,
            title: 'Software Testing Services',
            budget: '1,000,000',
            deadline: '30 Aug 2026',
        },
        {
            id: 6,
            title: 'Managed Migration Services',
            budget: '1,000,000',
            deadline: '30 Aug 2026',
        },
    ];

    return (
        <div className="bg-white rounded-popup p-6 w-full h-full border border-gray-200 shadow-xs font-sans">
            <h3 className="text-md !font-bold text-gray-900 mb-4 px-1">
                Job Listing
            </h3>

            <div className="bg-gray-100/60 rounded-button p-4 flex flex-col gap-3">
                {mockJobs.map((job) => (
                    <div
                        key={job.id}
                        className="bg-white rounded-button px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between shadow-sm border border-gray-200"
                    >
                        <div className="flex-1 text-sm !font-bold text-gray-900">
                            {job.title}
                        </div>

                        <div className="flex gap-20 text-xs text-gray-400 mr-8 mt-2 sm:mt-0">
                            <div className="flex flex-col items-start">
                                <span className="text-xs text-gray-400">
                                    Budget
                                </span>
                                <span className="font-semibold text-gray-800">
                                    {job.budget}
                                </span>
                            </div>

                            <div className="flex flex-col items-start">
                                <span className="text-xs text-gray-400">
                                    Deadline
                                </span>
                                <span className="font-semibold text-gray-800">
                                    {job.deadline}
                                </span>
                            </div>
                        </div>

                        <button className="text-[#497B93] hover:underline text-xs !font-medium mt-2 sm:mt-0 transition-colors ml-8">
                            Details
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
