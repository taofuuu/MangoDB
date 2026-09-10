'use client';
import React, { useState, ChangeEvent } from 'react';

// Data types
export interface BlockContent {
    title1: string;
    body1: string;
    title2: string;
    body2: string;
}

export interface DualSectionData {
    services: BlockContent;
    jobs: BlockContent;
}

export default function ServicesDashboard() {
    // 1. Active Tab State for the display panel
    const [activeTab, setActiveTab] = useState<'services' | 'jobs'>('services');

    // 2. Form & Section Data State
    const [data, setData] = useState<DualSectionData>({
        services: {
            title1: 'DevOps & Infrastructure Setup',
            body1: 'Automated CI/CD pipelines, cloud provisioning, and cluster management optimized for scale.',
            title2: 'Cybersecurity Compliance',
            body2: 'Comprehensive security audits, risk management frameworks, and automated compliance checks.',
        },
        jobs: {
            title1: 'Senior DevOps Engineer',
            body1: 'Full-time • Remote — Looking for 5+ years experience in AWS, Kubernetes, and Terraform.',
            title2: 'Lead UI/UX Designer',
            body2: 'Full-time • Hybrid — Seeking a product designer to lead design systems and user research.',
        },
    });

    const currentTabContent = data[activeTab];

    return (
        <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50 max-w-5xl mx-auto rounded-3xl">
            <main className="flex-1 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col font-sans">
                {/* Tab Switcher */}
                <div className="bg-gray-100 p-1 rounded-xl flex mb-4 text-xs">
                    <button
                        type="button"
                        onClick={() => setActiveTab('services')}
                        className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                            activeTab === 'services'
                                ? 'bg-white shadow text-[#497B93]'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Services
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('jobs')}
                        className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                            activeTab === 'jobs'
                                ? 'bg-white shadow text-[#497B93]'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Job Listing
                    </button>
                </div>

                {/* Display Content */}
                <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1 flex-1">
                    {/* Item 1 */}
                    <div className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-800">
                                {currentTabContent.title1 || 'Untitled Item'}
                            </span>
                            <button className="text-xs text-[#497B93] hover:underline font-medium">
                                Details
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            {currentTabContent.body1 ||
                                'No description provided.'}
                        </p>
                    </div>

                    {/* Item 2 */}
                    <div className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-800">
                                {currentTabContent.title2 || 'Untitled Item'}
                            </span>
                            <button className="text-xs text-[#497B93] hover:underline font-medium">
                                Details
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            {currentTabContent.body2 ||
                                'No description provided.'}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
