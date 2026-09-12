'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CompanyProfile } from '@mangodb/shared';
import { ApiRequestError } from '@/lib/api';
import { getMyProfile } from '@/lib/companies';
import CompanyCard, {
    toCompanyCardData,
} from '@/components/viewprofile/Companycard';
import ServicesSection from '@/components/viewprofile/ServicesSection';
import ProjectTimeline from '@/components/viewprofile/ProjectTimeline';
import PortfolioList from '@/components/viewprofile/PortfolioList';

export default function ViewProfilePage() {
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        getMyProfile()
            .then(setProfile)
            .catch((err: unknown) => {
                if (err instanceof ApiRequestError && err.status === 401) {
                    setLoadError('no-token');
                    return;
                }
                setLoadError(
                    err instanceof ApiRequestError
                        ? err.message
                        : 'Could not reach the API. Is it running on port 4000?',
                );
            });
    }, []);

    return (
        <div className="min-h-screen bg-stone-50 p-6 font-sans">
            {loadError === 'no-token' && (
                <p className="text-sm">
                    You are not signed in.{' '}
                    <Link href="/login" className="underline">
                        Log in
                    </Link>
                    , then come back.
                </p>
            )}

            {loadError && loadError !== 'no-token' && (
                <p className="text-sm text-red-600">{loadError}</p>
            )}

            {!loadError && !profile && <p className="text-sm">Loading…</p>}

            {profile && (
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
                        <PortfolioList companyId={profile.company_id} />
                    </div>
                </main>
            )}
        </div>
    );
}
