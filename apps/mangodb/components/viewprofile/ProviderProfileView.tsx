'use client';

import type { CompanyProfile } from '@mangodb/shared';
import CompanyCard, { toCompanyCardData } from './Companycard';
import ServicesSection from './ServicesSection';
import ProjectTimeline from './ProjectTimeline';
import PortfolioList from './PortfolioList';

// The provider-shaped profile: the company card, its services, a project
// timeline and its portfolio.
//
// A BOTH company sees this one rather than the receiver page. That was the
// team's call: this page carries more, and a company that both offers and
// requests work still has one profile to show.
export default function ProviderProfileView({
    profile,
}: {
    profile: CompanyProfile;
}) {
    return (
        <div className="min-h-screen bg-surface p-6">
            {/* Five columns split 3/2, not three split 2/1: the narrow
                column was too tight for a tab switcher and a list. */}
            <main className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <CompanyCard data={toCompanyCardData(profile)} />
                </div>
                <div className="lg:col-span-2">
                    <ServicesSection />
                </div>
                <div className="lg:col-span-3">
                    <ProjectTimeline />
                </div>
                <div className="lg:col-span-2">
                    <PortfolioList companyId={profile.companyId} />
                </div>
            </main>
        </div>
    );
}
