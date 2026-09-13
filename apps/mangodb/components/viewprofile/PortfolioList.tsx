'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ServicePortfolio } from '@mangodb/shared';
import type { CertificateResponse } from '@/components/forms/AddCertificateForm';
import { getPortfolios } from '@/lib/portfolios';
import { getCertificates } from '@/lib/certificate';
import { monthLabel } from '@/components/sm-detail/MonthDropdown';

// Matches the card's fixed-height design: enough to preview at a glance,
// the rest lives behind "See more" instead of an in-card scrollbar.
const MAX_VISIBLE_ITEMS = 3;

function formatPortfolioDate(dateString: string): string {
    // Split rather than new Date() — an ISO date parses as UTC midnight and
    // would render a day early west of UTC.
    const [year, month, day] = dateString.split('-');
    return `${Number(day)} ${monthLabel(String(Number(month)))} ${year}`;
}

function formatCertificateDate(cert: CertificateResponse): string {
    if (!cert.issue_month || !cert.issue_year) return '—';
    return `${monthLabel(String(cert.issue_month))} ${cert.issue_year}`;
}

interface DisplayItem {
    id: number;
    title: string;
    date: string;
}

interface PortfolioCertificateListProps {
    companyId: number;
}

export default function PortfolioCertificateList({
    companyId,
}: PortfolioCertificateListProps) {
    const [activeTab, setActiveTab] = useState<'portfolio' | 'certificates'>(
        'portfolio',
    );
    const [portfolioItems, setPortfolioItems] = useState<ServicePortfolio[]>(
        [],
    );
    const [certificateItems, setCertificateItems] = useState<
        CertificateResponse[]
    >([]);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        getPortfolios(companyId)
            .then((items) => setPortfolioItems(items))
            .catch(() => setLoadError('Could not load portfolio items.'));

        getCertificates()
            .then((items) => setCertificateItems(items))
            .catch(() =>
                setLoadError(
                    (current) => current ?? 'Could not load certificates.',
                ),
            );
    }, [companyId]);

    const displayItems: DisplayItem[] =
        activeTab === 'portfolio'
            ? portfolioItems.map((item) => ({
                  id: item.portfolio_id,
                  title: item.portfolio_name,
                  date: formatPortfolioDate(item.development_date),
              }))
            : certificateItems.map((item) => ({
                  id: item.certificate_id,
                  title: item.cert_title,
                  date: formatCertificateDate(item),
              }));

    const visibleItems = displayItems.slice(0, MAX_VISIBLE_ITEMS);
    const seeMoreHref =
        activeTab === 'portfolio' ? '/portfolio' : '/certificate';

    return (
        <div className="bg-white rounded-[30px] p-8 border border-[#C4C4C4] shadow-sm flex flex-col relative w-full h-[420px] overflow-hidden">
            {/* Tab Switcher */}
            <div className="bg-gray-100 p-1 rounded-xl flex w-full mb-4 text-xs">
                <button
                    type="button"
                    onClick={() => setActiveTab('portfolio')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                        activeTab === 'portfolio'
                            ? 'bg-white shadow text-[#497B93]'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Portfolio
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('certificates')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                        activeTab === 'certificates'
                            ? 'bg-white shadow text-[#497B93]'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Certificate
                </button>
            </div>

            {/* Title Header */}
            <h3 className="text-sm font-bold text-gray-800 mb-3 capitalize">
                {activeTab === 'portfolio' ? 'Portfolio' : 'Certificates'}
            </h3>

            {loadError && (
                <p className="text-xs text-[#C5483E] mb-2">{loadError}</p>
            )}

            {/* List Display */}
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                {visibleItems.length === 0 && !loadError && (
                    <div className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 text-xs text-gray-400">
                        {activeTab === 'portfolio'
                            ? 'No portfolio items yet.'
                            : 'No certificates yet.'}
                    </div>
                )}

                {visibleItems.map((item) => (
                    <div
                        key={item.id}
                        className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition space-y-1"
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-800">
                                {item.title || 'Untitled Item'}
                            </span>
                            <button className="text-xs text-[#497B93] hover:underline font-medium">
                                Details
                            </button>
                        </div>

                        {/* Description/Body section with date fallback */}
                        <p className="text-xs text-gray-600 leading-relaxed">
                            {item.date || 'No description provided.'}
                        </p>
                    </div>
                ))}
            </div>

            {displayItems.length > MAX_VISIBLE_ITEMS && (
                <div className="mt-3 text-right">
                    <Link
                        href={seeMoreHref}
                        className="text-xs text-[#497B93] hover:underline font-medium"
                    >
                        See more
                    </Link>
                </div>
            )}
        </div>
    );
}
