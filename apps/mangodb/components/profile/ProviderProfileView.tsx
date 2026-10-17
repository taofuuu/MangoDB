'use client';

import type { PublicCompanyProfile } from '@mangodb/shared';
import CompanyCard, { toCompanyCardData } from './ProviderCompanyCard';
import ServicesSection from './ServicesSection';
import ProjectTimeline from './ProjectTimeline';
import PortfolioCertificateList from './PortfolioCertificateList';

// The provider-shaped profile: the company card, its services, a project
// timeline and its portfolio.
//
// A BOTH company sees this one rather than the receiver page. That was the
// team's call: this page carries more, and a company that both offers and
// requests work still has one profile to show.
//
// readOnly is another company's profile (T2.7.17): the same page with nothing
// on it that edits.
export default function ProviderProfileView({
    profile,
    readOnly = false,
}: {
    profile: PublicCompanyProfile;
    readOnly?: boolean;
}) {
    return (
        <div className="min-h-screen bg-surface p-6">
            {/* Five columns split 3/2, not three split 2/1: the narrow
                column was too tight for a tab switcher and a list. */}
            <main className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <CompanyCard
                        data={toCompanyCardData(profile)}
                        readOnly={readOnly}
                    />
                </div>
                <div className="lg:col-span-2">
                    <ServicesSection profile={profile} readOnly={readOnly} />
                </div>
                <div className="lg:col-span-3">
                    <ProjectTimeline />
                </div>
                <div className="lg:col-span-2">
                    <PortfolioCertificateList
                        companyId={profile.companyId}
                        readOnly={readOnly}
                    />
                </div>
            </main>
        </div>
    );
}
