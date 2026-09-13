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
        <div className="min-h-screen bg-stone-50 p-6 font-sans">
            <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <CompanyCard data={toCompanyCardData(profile)} />
                </div>
                <div className="lg:col-span-1">
                    <ServicesSection />
                </div>
                <div className="lg:col-span-2">
                    <ProjectTimeline />
                </div>
                <div className="lg:col-span-1">
                    <PortfolioList companyId={profile.companyId} />
                </div>
            </main>
        </div>
    );
}
