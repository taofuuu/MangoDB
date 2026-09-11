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
        <div className="bg-[#EDEDED] rounded-3xl p-6 w-full h-full font-sans">
            <h3 className="text-base font-bold text-gray-900 mb-4 px-1">
                Job Listing
            </h3>

            <div className="flex flex-col gap-3">
                {mockJobs.map((job) => (
                    <div
                        key={job.id}
                        className="bg-white rounded-xl px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between shadow-xs border border-gray-100/60"
                    >
                        <div className="flex-1 font-bold text-gray-900 text-sm">
                            {job.title}
                        </div>

                        <div className="flex gap-10 text-xs text-gray-400 mr-8 mt-2 sm:mt-0">
                            <div className="flex flex-col items-start">
                                <span className="text-[11px] text-gray-400 font-normal">
                                    Budget
                                </span>
                                <span className="font-semibold text-gray-800">
                                    {job.budget}
                                </span>
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[11px] text-gray-400 font-normal">
                                    Deadline
                                </span>
                                <span className="font-semibold text-gray-800">
                                    {job.deadline}
                                </span>
                            </div>
                        </div>

                        <button className="text-[#497B93] hover:underline text-xs font-medium mt-2 sm:mt-0 transition-colors">
                            Details
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
