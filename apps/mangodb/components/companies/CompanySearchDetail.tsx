'use client';

import { useEffect, useState } from 'react';
import type { CompanySummary } from '@mangodb/shared';
import { Star, X } from 'lucide-react';
import CompanyAvatar from '@/components/viewprofile/CompanyAvatar';
import ModalShell from '@/components/ui/ModalShell';
import RoleTags from '@/components/ui/RoleTags';
import { isProviderAccount } from '@/lib/roles';

const detailPanelBaseClassName =
    'flex h-[72.63vh] flex-col rounded-popup bg-surface-white px-[1.5vw] py-[2.5vh] text-left shadow-[0_0_8px_rgba(73,123,147,0.25)]';
const listDetailPanelClassName = `${detailPanelBaseClassName} w-[34vw]`;
const popupDetailPanelClassName = `${detailPanelBaseClassName} w-full max-w-[calc(100vw-2rem)] sm:w-[45vw]`;

type CompanySearchDetailProps = {
    company: CompanySummary | null;
    onClose: () => void;
};

type DetailRowProps = {
    label: string;
    value: string | null;
};

function DetailRow({ label, value }: DetailRowProps) {
    return (
        <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-[1.04vw] border-b border-line py-[1.11vh]">
            <dt className="type-sm !font-[600] text-ink-soft">{label}</dt>
            <dd className="min-w-0 break-words type-sm text-ink">
                {value || 'Not provided'}
            </dd>
        </div>
    );
}

function DetailBody({ company }: { company: CompanySummary }) {
    const showProviderDetails = isProviderAccount(company.accountType);

    return (
        <>
            <div className="mb-[1.85vh] flex items-center gap-[1.04vw]">
                <CompanyAvatar
                    name={company.companyName}
                    photoUrl={company.companyPhoto}
                    size={76}
                />
                <div className="min-w-0 flex-1">
                    <RoleTags
                        accountType={company.accountType}
                        className="flex-wrap gap-[0.52vw]"
                        tagClassName="h-auto px-[0.83vw] py-[0.37vh] type-xs !font-[600]"
                    />
                    <span className="mt-[0.74vh] inline-flex items-center gap-[0.31vw] type-sm text-ink-soft">
                        <Star
                            aria-hidden="true"
                            className="h-[1.67vh] w-[0.94vw] fill-accent text-accent"
                        />
                        {company.averageRating?.toFixed(1) ?? 'No rating'}
                        {company.ratingCount > 0 && ` (${company.ratingCount})`}
                    </span>
                </div>
            </div>

            <p className="mb-[1.85vh] type-sm leading-relaxed text-ink-soft">
                {company.companyDescription ||
                    'No company description provided.'}
            </p>

            <dl>
                <DetailRow label="Contact email" value={company.contactEmail} />
                <DetailRow label="Phone" value={company.phone} />
                <DetailRow label="Address" value={company.address} />
                <DetailRow label="Website" value={company.website} />
                <DetailRow
                    label="Company type"
                    value={company.companyType.join(', ')}
                />
                <DetailRow
                    label="Service categories"
                    value={company.categories.join(', ')}
                />
                <DetailRow
                    label="Technologies"
                    value={company.techStack.join(', ')}
                />
                {showProviderDetails && (
                    <>
                        <DetailRow
                            label="Service terms"
                            value={company.serviceTerm}
                        />
                        <DetailRow
                            label="Warranty policy"
                            value={company.warrantyPolicy}
                        />
                    </>
                )}
            </dl>
        </>
    );
}

function DetailSurface({
    company,
    onClose,
}: {
    company: CompanySummary;
    onClose: () => void;
}) {
    return (
        <>
            <DetailHeader companyName={company.companyName} onClose={onClose} />
            <hr className="my-[2vh] border-0 border-t border-brand/30" />
            <div className="flex flex-1 flex-col overflow-y-auto pr-[0.5vw]">
                <DetailBody company={company} />
            </div>
        </>
    );
}

function DetailHeader({
    companyName,
    onClose,
}: {
    companyName: string;
    onClose: () => void;
}) {
    return (
        <div className="flex items-start justify-between gap-[1.04vw]">
            <div className="flex flex-col gap-[0.8vh]">
                <p className="type-sm text-brand">Company Detail</p>
                <h2
                    id="company-search-detail-title"
                    className="type-lg !font-[700] text-ink"
                >
                    {companyName}
                </h2>
            </div>
            <button
                type="button"
                onClick={onClose}
                aria-label="Close company detail"
                className="rounded-full p-2 transition hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
                <X aria-hidden="true" className="size-[22px]" />
            </button>
        </div>
    );
}

export default function CompanySearchDetail({
    company,
    onClose,
}: CompanySearchDetailProps) {
    const [isCompactViewport, setIsCompactViewport] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 1023px)');
        const updateViewport = () => setIsCompactViewport(mediaQuery.matches);

        updateViewport();
        mediaQuery.addEventListener('change', updateViewport);
        return () => mediaQuery.removeEventListener('change', updateViewport);
    }, []);

    if (!company) return null;

    if (isCompactViewport) {
        return (
            <ModalShell
                isOpen
                onClose={onClose}
                labelledBy="company-search-detail-title"
                panelClassName={popupDetailPanelClassName}
            >
                <DetailSurface company={company} onClose={onClose} />
            </ModalShell>
        );
    }

    return (
        <aside
            aria-labelledby="company-search-detail-title"
            className={listDetailPanelClassName}
        >
            <DetailSurface company={company} onClose={onClose} />
        </aside>
    );
}
