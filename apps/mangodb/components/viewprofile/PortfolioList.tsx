'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ServicePortfolio } from '@mangodb/shared';
import type { Certificate } from '@mangodb/shared';
import { listPortfolios } from '@/lib/portfolios';
import {
    listMyCertificates,
    listCompanyCertificates,
} from '@/lib/certificates';
import { monthLabel } from '@/components/sm-detail/MonthDropdown';
import { formatDateOnly } from '@/lib/dates';
import ProfileItemDetailModal, {
    type ProfileItem,
} from './ProfileItemDetailModal';

// Matches the card's fixed-height design: enough to preview at a glance,
// the rest lives behind "See more" instead of an in-card scrollbar.
const MAX_VISIBLE_ITEMS = 3;

function formatCertificateDate(cert: Certificate): string {
    if (!cert.issueMonth || !cert.issueYear) return '—';
    return `${monthLabel(String(cert.issueMonth))} ${cert.issueYear}`;
}

interface DisplayItem {
    id: number;
    title: string;
    date: string;
    entry: ProfileItem;
}

interface PortfolioCertificateListProps {
    companyId: number;
    // Another company's profile. Its certificates come from
    // GET /certificates?companyId=, since /certificates/mine is always the
    // viewer's own. "See more" goes to the viewer's own management pages, so
    // it is hidden.
    readOnly?: boolean;
}

export default function PortfolioCertificateList({
    companyId,
    readOnly = false,
}: PortfolioCertificateListProps) {
    const [activeTab, setActiveTab] = useState<'portfolio' | 'certificates'>(
        'portfolio',
    );
    const [portfolioItems, setPortfolioItems] = useState<ServicePortfolio[]>(
        [],
    );
    const [certificateItems, setCertificateItems] = useState<Certificate[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selected, setSelected] = useState<ProfileItem | null>(null);

    useEffect(() => {
        listPortfolios(companyId)
            .then((items) => setPortfolioItems(items))
            .catch(() => setLoadError('Could not load portfolio items.'));

        (readOnly ? listCompanyCertificates(companyId) : listMyCertificates())
            .then((items) => setCertificateItems(items))
            .catch(() =>
                setLoadError(
                    (current) => current ?? 'Could not load certificates.',
                ),
            );
    }, [companyId, readOnly]);

    const displayItems: DisplayItem[] =
        activeTab === 'portfolio'
            ? portfolioItems.map((item) => ({
                  id: item.portfolioId,
                  title: item.portfolioName,
                  date: formatDateOnly(item.developmentDate),
                  entry: { kind: 'portfolio', item },
              }))
            : certificateItems.map((item) => ({
                  id: item.certificateId,
                  title: item.certTitle,
                  date: formatCertificateDate(item),
                  entry: { kind: 'certificate', item },
              }));

    const visibleItems = displayItems.slice(0, MAX_VISIBLE_ITEMS);
    const seeMoreHref =
        activeTab === 'portfolio' ? '/portfolios' : '/certificates';

    return (
        <div className="bg-white rounded-popup p-8 border border-line shadow-sm flex flex-col relative w-full h-[420px] overflow-hidden">
            {/* Tab Switcher. Full width, matching the other three cards. */}
            <div className="bg-gray-100 p-1 rounded-button flex w-full mb-4 type-xs">
                <button
                    type="button"
                    onClick={() => setActiveTab('portfolio')}
                    className={`flex-1 py-1.5 rounded-button font-medium transition ${
                        activeTab === 'portfolio'
                            ? 'bg-white shadow text-brand'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Portfolio
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('certificates')}
                    className={`flex-1 py-1.5 rounded-button font-medium transition ${
                        activeTab === 'certificates'
                            ? 'bg-white shadow text-brand'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Certificate
                </button>
            </div>

            {/* Title Header */}
            <h3 className="type-sm !font-bold text-gray-800 mb-3 capitalize">
                {activeTab === 'portfolio' ? 'Portfolio' : 'Certificates'}
            </h3>

            {loadError && (
                <p className="type-xs text-danger mb-2">{loadError}</p>
            )}

            {/* List Display */}
            <div className="divide-y divide-gray-100">
                {visibleItems.length === 0 && !loadError && (
                    <p className="py-2 type-xs text-gray-400">
                        {activeTab === 'portfolio'
                            ? 'No portfolio items yet.'
                            : 'No certificates yet.'}
                    </p>
                )}
                {visibleItems.map((item) => (
                    <div
                        key={item.id}
                        className="py-2 flex justify-between items-center type-xs"
                    >
                        <span className="font-medium text-gray-700">
                            {item.title}
                        </span>
                        <div className="flex items-center gap-6">
                            <span className="text-gray-400 type-xs">
                                {item.date}
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelected(item.entry)}
                                aria-label={`Details for ${item.title}`}
                                className="text-brand hover:underline"
                            >
                                Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {!readOnly && displayItems.length > MAX_VISIBLE_ITEMS && (
                <div className="mt-3 text-right">
                    <Link
                        href={seeMoreHref}
                        className="type-xs text-brand hover:underline font-medium"
                    >
                        See more
                    </Link>
                </div>
            )}

            {selected && (
                <ProfileItemDetailModal
                    entry={selected}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );
}
