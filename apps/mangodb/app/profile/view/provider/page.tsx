'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CompanyProfile } from '@mangodb/shared';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';
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
                if (isNotSignedIn(err)) {
                    setLoadError(NOT_SIGNED_IN);
                    return;
                }
                setLoadError(describeError(err));
            });
    }, []);
    return (
        <div className="min-h-screen bg-stone-50 p-6 font-sans">
            {loadError === NOT_SIGNED_IN && (
                <p className="type-sm">
                    You are not signed in.{' '}
                    <Link href="/login" className="underline">
                        Log in
                    </Link>
                    , then come back.
                </p>
            )}

            {loadError && loadError !== NOT_SIGNED_IN && (
                <p className="type-sm text-red-600">{loadError}</p>
            )}

            {!loadError && !profile && <p className="type-sm">Loading…</p>}

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
                        <PortfolioList companyId={profile.companyId} />
                    </div>
                </main>
            )}
        </div>
    );
}
