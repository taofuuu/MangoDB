'use client';

import React from 'react';
import CompanyCard from './Companycart'; // Matches Companycart.jsx
import ServicesSection from './ServicesSection';
import ProjectTimeline from './ProjectTimeline';
import PortfolioList from './PortfoilioList'; // Matches PortfoilioList.jsx

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-stone-50 p-6 font-sans">
            {/* Top Navbar */}
            <header className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center font-bold text-red-600 text-xs">
                        M
                    </div>
                    <span className="font-semibold text-gray-700 text-sm">
                        MangoDB Cooperation
                    </span>
                </div>

                <nav className="flex items-center gap-8 font-semibold text-xs text-gray-700">
                    <a href="#" className="hover:text-sky-600">
                        HOME
                    </a>
                    <a href="#" className="hover:text-sky-600">
                        PROFILE
                    </a>
                    <a href="#" className="hover:text-sky-600">
                        MATCHING
                    </a>
                </nav>

                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="Search"
                        className="px-4 py-1.5 border border-gray-200 rounded-full text-xs w-48 focus:outline-none focus:ring-1 focus:ring-sky-400"
                    />
                    <div className="w-8 h-8 rounded-full bg-slate-500"></div>
                </div>
            </header>

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
