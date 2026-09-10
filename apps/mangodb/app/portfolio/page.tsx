'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ServicePortfolio } from '@mangodb/shared';
import PortfolioCard from '@/components/portfolio/PortfolioCard';
import PortfolioRow from '@/components/portfolio/PortfolioRow';
import ViewToggle, { PortfolioView } from '@/components/portfolio/ViewToggle';
import DeletePortfolioModal from '@/components/ui/DeletePortfolioModal';
import { ApiRequestError } from '@/lib/api';
import { getMyProfile } from '@/lib/companies';
import { getPortfolios, deletePortfolio } from '@/lib/portfolios';

export default function PortfolioPage() {
    // Null means still loading — the same three-state shape as profile/edit.
    const [items, setItems] = useState<ServicePortfolio[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [view, setView] = useState<PortfolioView>('grid');

    // The item the user asked to delete. Null means the popup is closed.
    const [pendingDelete, setPendingDelete] = useState<ServicePortfolio | null>(
        null,
    );

    // Two hops: /portfolios is public and needs to be told whose rows to
    // return, and /companies/me is the only thing that knows the id. No token
    // check first — without one that call 401s anyway, and an expired or
    // revoked token lands in the same place.
    useEffect(() => {
        getMyProfile()
            .then((profile) => getPortfolios(profile.company_id))
            .then(setItems)
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

    // No detail page yet, so the card opens the work sample itself.
    const handleOpen = (item: ServicePortfolio) => {
        window.open(item.portfolio_link, '_blank', 'noopener');
    };

    // The modal shows any thrown error and only closes once this resolves.
    const handleDelete = async () => {
        if (!pendingDelete) return;

        await deletePortfolio(pendingDelete.portfolio_id);

        setItems((current) =>
            (current ?? []).filter(
                (item) => item.portfolio_id !== pendingDelete.portfolio_id,
            ),
        );
    };

    return (
        <main className="min-h-screen bg-[#FFFDF9] px-[8.13vw] pt-[7.5vh] pb-[7.5vh] text-[#171717] max-md:px-[5vw]">
            <div className="flex items-start justify-between gap-[2vw] max-md:flex-col max-md:gap-[2vh]">
                <div>
                    <h1 className="text-hd !text-[48px] leading-none">
                        Portfolio
                    </h1>

                    <p className="mt-[1vh] text-lg !font-[400]">
                        List of company&apos;s portfolio
                    </p>
                </div>

                {items && <ViewToggle value={view} onChange={setView} />}
            </div>

            {loadError === 'no-token' && (
                <p className="mt-[4.5vh] text-md !font-[400]">
                    You are not signed in.{' '}
                    <Link href="/login" className="underline">
                        Log in
                    </Link>
                    , then come back.
                </p>
            )}

            {loadError && loadError !== 'no-token' && (
                <p className="mt-[4.5vh] text-md !font-[400] text-[#C5483B]">
                    {loadError}
                </p>
            )}

            {!loadError && !items && (
                <p className="mt-[4.5vh] text-md !font-[400]">Loading…</p>
            )}

            {items?.length === 0 && (
                <p className="mt-[4.5vh] text-md !font-[400] text-[#757575]">
                    No portfolio items yet.
                </p>
            )}

            {items && view === 'grid' && (
                <div className="mt-[4.5vh] grid grid-cols-4 gap-x-[3.49vw] gap-y-[3.7vh] max-lg:grid-cols-2 max-sm:grid-cols-1">
                    {items.map((item) => (
                        <PortfolioCard
                            key={item.portfolio_id}
                            item={item}
                            onClick={handleOpen}
                            onDelete={setPendingDelete}
                        />
                    ))}
                </div>
            )}

            {items && view === 'list' && (
                <div className="mt-[4.5vh] flex flex-col gap-[2vh]">
                    {items.map((item) => (
                        <PortfolioRow
                            key={item.portfolio_id}
                            item={item}
                            onClick={handleOpen}
                            onDelete={setPendingDelete}
                        />
                    ))}
                </div>
            )}

            <DeletePortfolioModal
                isOpen={pendingDelete !== null}
                onClose={() => setPendingDelete(null)}
                onConfirm={handleDelete}
            />
        </main>
    );
}
