'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CompanySummary, PublicCompanyProfile } from '@mangodb/shared';
import { X } from 'lucide-react';
import Button from '@/components/ui/Button';
import CompanyAvatar from '@/components/viewprofile/CompanyAvatar';
import ModalShell from '@/components/ui/ModalShell';
import RoleTags from '@/components/ui/RoleTags';
import { describeError } from '@/lib/api';
import { getCompanyProfile } from '@/lib/companies';
import { isProviderAccount } from '@/lib/roles';

const detailPanelBaseClassName =
    'flex h-[72.63vh] flex-col rounded-popup bg-surface-white px-[1.5vw] py-[2.5vh] text-left shadow-[0_0_8px_rgba(73,123,147,0.25)]';
const listDetailPanelClassName = `${detailPanelBaseClassName} w-[34vw]`;
const popupDetailPanelClassName = `${detailPanelBaseClassName} w-full max-w-[calc(100vw-2rem)] sm:w-[45vw]`;

type CompanySearchDetailProps = {
    company: CompanySummary | null;
    onClose: () => void;
};

type DetailRequestState = {
    companyId: number;
    profile: PublicCompanyProfile | null;
    error: string | null;
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

function DetailBody({
    company,
    summary,
}: {
    company: PublicCompanyProfile;
    summary: CompanySummary;
}) {
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
                {showProviderDetails && (
                    <>
                        <DetailRow
                            label="Service categories"
                            value={summary.categories.join(', ')}
                        />
                        <DetailRow
                            label="Technologies"
                            value={summary.techStack.join(', ')}
                        />
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

            {/* The panel is a summary; the profile page has the rest, such
                as portfolio and certificates. */}
            <Link
                href={`/companies/${company.companyId}`}
                className="mt-[1.85vh] self-start type-sm !font-[600] text-brand hover:underline"
            >
                View full profile
            </Link>
        </>
    );
}

function DetailSurface({
    summary,
    profile,
    error,
    onRetry,
    onClose,
}: {
    summary: CompanySummary;
    profile: PublicCompanyProfile | null;
    error: string | null;
    onRetry: () => void;
    onClose: () => void;
}) {
    return (
        <>
            <DetailHeader companyName={summary.companyName} onClose={onClose} />
            <hr className="my-[2vh] border-0 border-t border-brand/30" />
            <div className="flex flex-1 flex-col overflow-y-auto pr-[0.5vw]">
                {profile ? (
                    <DetailBody company={profile} summary={summary} />
                ) : error ? (
                    <div role="alert" className="type-sm text-danger">
                        <p>{error}</p>
                        <Button
                            variant="outline"
                            onClick={onRetry}
                            className="mt-[1.11vh] min-h-[40px] px-[1.04vw] type-sm"
                        >
                            Try again
                        </Button>
                    </div>
                ) : (
                    <p className="type-sm text-ink-soft">
                        Loading company details…
                    </p>
                )}
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
            <div className="flex min-w-0 flex-1 flex-col gap-[0.8vh]">
                <p className="type-sm text-brand">Company Detail</p>
                <h2
                    id="company-search-detail-title"
                    className="line-clamp-3 break-words type-lg leading-tight !font-[700] text-ink"
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
    const [detailState, setDetailState] = useState<DetailRequestState | null>(
        null,
    );
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 1023px)');
        const updateViewport = () => setIsCompactViewport(mediaQuery.matches);

        updateViewport();
        mediaQuery.addEventListener('change', updateViewport);
        return () => mediaQuery.removeEventListener('change', updateViewport);
    }, []);

    useEffect(() => {
        if (!company) return;

        let cancelled = false;
        const companyId = company.companyId;

        getCompanyProfile(companyId)
            .then((nextProfile) => {
                if (!cancelled) {
                    setDetailState({
                        companyId,
                        profile: nextProfile,
                        error: null,
                    });
                }
            })
            .catch((requestError: unknown) => {
                if (!cancelled) {
                    setDetailState({
                        companyId,
                        profile: null,
                        error: describeError(requestError),
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [company, reloadKey]);

    if (!company) return null;

    const currentDetail =
        detailState?.companyId === company.companyId ? detailState : null;
    const retry = () => {
        setDetailState(null);
        setReloadKey((key) => key + 1);
    };

    if (isCompactViewport) {
        return (
            <ModalShell
                isOpen
                onClose={onClose}
                labelledBy="company-search-detail-title"
                panelClassName={popupDetailPanelClassName}
            >
                <DetailSurface
                    summary={company}
                    profile={currentDetail?.profile ?? null}
                    error={currentDetail?.error ?? null}
                    onRetry={retry}
                    onClose={onClose}
                />
            </ModalShell>
        );
    }

    return (
        <aside
            aria-labelledby="company-search-detail-title"
            className={listDetailPanelClassName}
        >
            <DetailSurface
                summary={company}
                profile={currentDetail?.profile ?? null}
                error={currentDetail?.error ?? null}
                onRetry={retry}
                onClose={onClose}
            />
        </aside>
    );
}
