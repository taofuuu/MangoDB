'use client';
import React, { useState } from 'react';

const servicesData = [
    { id: 1, name: 'DevOps & Infrastructure Setup' },
    { id: 2, name: 'Data Engineering & Pipeline Setup' },
    { id: 3, name: 'UI/UX Design' },
    { id: 4, name: 'Cybersecurity Compliance & Auditing' },
];

export default function ServicesSection() {
    const [activeTab, setActiveTab] = useState('services');

    return (
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm h-full flex flex-col">
            {/* Tab Switcher */}
            <div className="bg-gray-100 p-1 rounded-xl flex mb-4 text-xs">
                <button
                    onClick={() => setActiveTab('services')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition ${activeTab === 'services' ? 'bg-white shadow text-sky-600' : 'text-gray-500'}`}
                >
                    Services
                </button>
                <button
                    onClick={() => setActiveTab('jobs')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition ${activeTab === 'jobs' ? 'bg-white shadow text-sky-600' : 'text-gray-500'}`}
                >
                    Job Listing
                </button>
            </div>

            {/* Services Scroll List */}
            <div className="space-y-3 overflow-y-auto max-h-[220px] pr-2">
                {servicesData.map((service) => (
                    <div
                        key={service.id}
                        className="p-3 border border-gray-100 rounded-xl flex justify-between items-center bg-gray-50/50 hover:bg-gray-50 transition"
                    >
                        <span className="text-xs font-medium text-gray-800">
                            {service.name}
                        </span>
                        <button className="text-xs text-sky-600 hover:underline">
                            Details
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
