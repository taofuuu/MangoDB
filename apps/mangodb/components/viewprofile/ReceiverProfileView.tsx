'use client';

import type { PublicCompanyProfile } from '@mangodb/shared';
import ReceiverCompanyCard, {
    toReceiverCompanyCardData,
} from './ReceiverCompanyCard';
import JobListing from './JobListing';

// The receiver-shaped profile: a narrow company card beside the job listings
// the company has posted. Only a RECEIVER-only company sees it — a BOTH
// company gets ProviderProfileView. readOnly is another company's profile
// (T2.7.17).
export default function ReceiverProfileView({
    profile,
    readOnly = false,
}: {
    profile: PublicCompanyProfile;
    readOnly?: boolean;
}) {
    return (
        <div className="min-h-screen bg-surface p-6 lg:p-8">
            <main className="max-w-screen-2xl mx-auto flex flex-col lg:flex-row gap-5 items-stretch">
                {/* Left Receiver Card */}
                <aside className="w-full lg:w-[360px] flex-shrink-0 lg:h-[840px]">
                    <ReceiverCompanyCard
                        data={toReceiverCompanyCardData(profile)}
                        readOnly={readOnly}
                    />
                </aside>

                {/* Right Job Listing Container */}
                <section className="flex-1 w-full lg:h-[840px]">
                    <JobListing companyId={profile.companyId} />
                </section>
            </main>
        </div>
    );
}
