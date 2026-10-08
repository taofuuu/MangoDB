'use client';

import type { CompanySummary } from '@mangodb/shared';
import { Star, X } from 'lucide-react';
import CompanyAvatar from '@/components/viewprofile/CompanyAvatar';
import ModalShell from '@/components/ui/ModalShell';
import RoleTags from '@/components/ui/RoleTags';
import type { CompanyView } from './CompanyViewToggle';

const detailPanelBaseClassName =
    'flex h-[72.63vh] flex-col rounded-popup bg-surface-white px-[1.5vw] py-[2.5vh] text-left shadow-[0_0_8px_rgba(73,123,147,0.25)]';
const listDetailPanelClassName = `${detailPanelBaseClassName} w-[34vw]`;
const popupDetailPanelClassName = `${detailPanelBaseClassName} w-[45vw] max-w-[calc(100vw-2rem)]`;

type CompanySearchDetailProps = {
    company: CompanySummary | null;
    view: CompanyView;
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
                <DetailRow
                    label="Company ID"
                    value={String(company.companyId)}
                />
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
                <DetailRow label="Service terms" value={company.serviceTerm} />
                <DetailRow
                    label="Warranty policy"
                    value={company.warrantyPolicy}
                />
            </dl>
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
    view,
    onClose,
}: CompanySearchDetailProps) {
    if (!company) return null;

    if (view === 'list') {
        return (
            <aside
                aria-labelledby="company-search-detail-title"
                className={listDetailPanelClassName}
            >
                <DetailHeader
                    companyName={company.companyName}
                    onClose={onClose}
                />
                <hr className="my-[2vh] border-0 border-t border-brand/30" />
                <div className="flex flex-1 flex-col overflow-y-auto pr-[0.5vw]">
                    <DetailBody company={company} />
                </div>
            </aside>
        );
    }

    return (
        <ModalShell
            isOpen
            onClose={onClose}
            labelledBy="company-search-detail-title"
            panelClassName={popupDetailPanelClassName}
        >
            <DetailHeader companyName={company.companyName} onClose={onClose} />
            <hr className="my-[2vh] border-0 border-t border-brand/30" />
            <div className="flex flex-1 flex-col overflow-y-auto pr-[0.5vw]">
                <DetailBody company={company} />
            </div>
        </ModalShell>
    );
}
