'use client';

import React from 'react';
import ReceiverCompanyCard from '@/components/viewprofile/ReceiverCompanyCard';
import JobListing from '@/components/viewprofile/JobListing';

export default function ReceiverViewPage() {
    return (
        <div className="min-h-screen bg-white p-6 lg:p-8">
            <main className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-5 items-stretch">
                {/* Left Receiver Card */}
                <aside className="w-full lg:w-[320px] flex-shrink-0">
                    <ReceiverCompanyCard />
                </aside>

                {/* Right Job Listing Container */}
                <section className="flex-1 w-full">
                    <JobListing />
                </section>
            </main>
        </div>
    );
}
