'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ServicePortfolio } from '@mangodb/shared';
import PortfolioCard from '@/components/portfolio/PortfolioCard';
import PortfolioRow from '@/components/portfolio/PortfolioRow';
import ViewToggle, { PortfolioView } from '@/components/portfolio/ViewToggle';
import DeletePortfolioModal from '@/components/ui/DeletePortfolioModal';
import EditPortfolioForm from '@/components/forms/EditPortfolioForm';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';
import { getMyProfile } from '@/lib/companies';
import { getPortfolios, deletePortfolio } from '@/lib/portfolios';

export default function PortfolioPage() {
    // Null means still loading — the same three-state shape as profile/edit.
    const [items, setItems] = useState<ServicePortfolio[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [view, setView] = useState<PortfolioView>('grid');
    const [pendingEdit, setPendingEdit] = useState<ServicePortfolio | null>(
        null,
    );

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
            .then((profile) => getPortfolios(profile.companyId))
            .then(setItems)
            .catch((err: unknown) => {
                if (isNotSignedIn(err)) {
                    setLoadError(NOT_SIGNED_IN);
                    return;
                }

                setLoadError(describeError(err));
            });
    }, []);

    // The modal shows any thrown error and only closes once this resolves.
    const handleDelete = async () => {
        if (!pendingDelete) return;

        await deletePortfolio(pendingDelete.portfolioId);

        setItems((current) =>
            (current ?? []).filter(
                (item) => item.portfolioId !== pendingDelete.portfolioId,
            ),
        );
    };

    const handleEdit = (updated: ServicePortfolio) => {
        setItems((current) =>
            (current ?? []).map((item) =>
                item.portfolioId === updated.portfolioId ? updated : item,
            ),
        );
    };

    return (
        <main className="min-h-screen bg-surface px-[8.13vw] pt-[7.5vh] pb-[7.5vh] text-ink max-md:px-[5vw]">
            <div className="flex items-start justify-between gap-[2vw] max-md:flex-col max-md:gap-[2vh]">
                <div>
                    <h1 className="type-hd !text-[48px] leading-none">
                        Portfolio
                    </h1>

                    <p className="mt-[1vh] type-lg !font-[400]">
                        List of company&apos;s portfolio
                    </p>
                </div>

                {items && <ViewToggle value={view} onChange={setView} />}
            </div>

            {loadError === NOT_SIGNED_IN && (
                <p className="mt-[4.5vh] type-md !font-[400]">
                    You are not signed in.{' '}
                    <Link href="/login" className="underline">
                        Log in
                    </Link>
                    , then come back.
                </p>
            )}

            {loadError && loadError !== NOT_SIGNED_IN && (
                <p className="mt-[4.5vh] type-md !font-[400] text-danger">
                    {loadError}
                </p>
            )}

            {!loadError && !items && (
                <p className="mt-[4.5vh] type-md !font-[400]">Loading…</p>
            )}

            {items?.length === 0 && (
                <p className="mt-[4.5vh] type-md !font-[400] text-ink-faint">
                    No portfolio items yet.
                </p>
            )}

            {items && view === 'grid' && (
                <div className="mt-[4.5vh] grid grid-cols-4 gap-x-[3.49vw] gap-y-[3.7vh] max-lg:grid-cols-2 max-sm:grid-cols-1">
                    {items.map((item) => (
                        <PortfolioCard
                            key={item.portfolioId}
                            item={item}
                            onEdit={setPendingEdit}
                            onDelete={setPendingDelete}
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
                            onEdit={setPendingEdit}
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

            {pendingEdit && (
                <EditPortfolioForm
                    key={pendingEdit.portfolioId}
                    portfolio={pendingEdit}
                    onClose={() => setPendingEdit(null)}
                    onSave={handleEdit}
                />
            )}
        </main>
    );
}
