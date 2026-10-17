'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ServicePortfolio } from '@mangodb/shared';
import PortfolioCard from '@/components/portfolio/PortfolioCard';
import PortfolioRow from '@/components/portfolio/PortfolioRow';
import ImageModal, { type ExpandedImage } from '@/components/ui/ImageModal';
import ViewToggle, { PortfolioView } from '@/components/portfolio/ViewToggle';
import {
    NOT_SIGNED_IN,
    describeError,
    isNotSignedIn,
    parseId,
} from '@/lib/api';
import { getCompanyProfile } from '@/lib/companies';
import { listPortfolios } from '@/lib/portfolios';
import { redirectToUnauthorized } from '@/lib/session';

const NOT_FOUND = 'This company could not be found.';

// Tagged with the id it answers, so moving to another company shows
// "Loading…" instead of the previous company's items.
type LoadResult =
    | { companyId: number; companyName: string; items: ServicePortfolio[] }
    | { companyId: number; error: string };

// /profile/[companyId]/portfolios: another company's whole portfolio, opened
// from See more on its profile. The same cards as /portfolios, without Edit
// and Delete.
export default function CompanyPortfoliosPage() {
    const companyId = parseId(useParams().companyId);
    const [result, setResult] = useState<LoadResult | null>(null);
    const [view, setView] = useState<PortfolioView>('grid');
    const [expandedImage, setExpandedImage] = useState<ExpandedImage | null>(
        null,
    );

    useEffect(() => {
        if (companyId === null) return;

        let cancelled = false;
        // The profile gives the name for the heading, and its 404 is the
        // one place an unknown or deleted company shows up: /portfolios
        // answers an empty list for those.
        Promise.all([
            getCompanyProfile(companyId),
            listPortfolios({ companyId }),
        ])
            .then(([profile, items]) => {
                if (cancelled) return;
                setResult({
                    companyId,
                    companyName: profile.companyName,
                    items,
                });
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                if (isNotSignedIn(err)) {
                    setResult({ companyId, error: NOT_SIGNED_IN });
                    redirectToUnauthorized();
                    return;
                }
                setResult({
                    companyId,
                    error: describeError(err, { 404: NOT_FOUND }),
                });
            });

        return () => {
            cancelled = true;
        };
    }, [companyId]);

    const current =
        companyId !== null && result?.companyId === companyId ? result : null;
    const loaded = current && 'items' in current ? current : null;
    const loadError =
        companyId === null
            ? NOT_FOUND
            : current && 'error' in current
              ? current.error
              : null;

    if (loadError === NOT_SIGNED_IN) {
        return <div className="min-h-screen bg-surface" />;
    }

    const items = loaded?.items;

    return (
        <main className="min-h-screen bg-surface px-[8.13vw] pt-[7.5vh] pb-[7.5vh] text-ink max-md:px-[5vw]">
            <div className="flex items-start justify-between gap-[2vw] max-md:flex-col max-md:gap-[2vh]">
                <div>
                    <h1 className="type-hd !text-[48px] leading-none">
                        {companyId !== null && (
                            <Link
                                href={`/profile/${companyId}`}
                                aria-label="Back to the company profile"
                                className="pr-4"
                            >
                                ←
                            </Link>
                        )}
                        Portfolio
                    </h1>

                    {loaded && (
                        <p className="mt-[1vh] type-lg !font-[400]">
                            {loaded.companyName}&apos;s portfolio
                        </p>
                    )}
                </div>

                {items && <ViewToggle value={view} onChange={setView} />}
            </div>

            {loadError && (
                <p
                    role="alert"
                    className="mt-[4.5vh] type-md !font-[400] text-danger"
                >
                    {loadError}
                </p>
            )}

            {!loadError && !items && (
                <p className="mt-[4.5vh] type-md !font-[400]">Loading…</p>
            )}

            {items?.length === 0 && (
                <p className="mt-[4.5vh] type-md !font-[400] text-ink-soft">
                    No portfolio items yet.
                </p>
            )}

            {items && view === 'grid' && (
                <div className="mt-[4.5vh] grid grid-cols-4 gap-x-[3.49vw] gap-y-[3.7vh] max-lg:grid-cols-2 max-sm:grid-cols-1">
                    {items.map((item) => (
                        <PortfolioCard
                            key={item.portfolioId}
                            item={item}
                            onExpandImage={setExpandedImage}
                        />
                    ))}
                </div>
            )}

            {items && view === 'list' && (
                <div className="mt-[4.5vh] flex flex-col gap-[2vh]">
                    {items.map((item) => (
                        <PortfolioRow
                            key={item.portfolioId}
                            item={item}
                            onExpandImage={setExpandedImage}
                        />
                    ))}
                </div>
            )}

            {expandedImage && (
                <ImageModal
                    image={expandedImage}
                    onClose={() => setExpandedImage(null)}
                />
            )}
        </main>
    );
}
