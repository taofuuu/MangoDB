'use client';

import React from 'react';
import CompanyCard from '@/components/viewprofile/Companycard';
import ServicesSection from '@/components/viewprofile/ServicesSection';
import ProjectTimeline from '@/components/viewprofile/ProjectTimeline';
import PortfolioList from '@/components/viewprofile/PortfolioList';

export default function ViewProfilePage() {
    return (
        <div className="min-h-screen bg-stone-50 p-6 font-sans">
            {/* Main Grid Workspace */}
            <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <CompanyCard />
                </div>
                <div className="lg:col-span-1">
                    <ServicesSection />
                </div>
                <div className="lg:col-span-2">
                    <ProjectTimeline />
                </div>
                <div className="lg:col-span-1">
                    <PortfolioList />
                </div>
            </main>
        </div>
    );
}
