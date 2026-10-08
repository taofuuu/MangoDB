'use client';

import type { CompanySummary } from '@mangodb/shared';
import { ArrowRight, Globe, Mail, Phone } from 'lucide-react';
import CompanyAvatar from '@/components/viewprofile/CompanyAvatar';
import { companyCardClassName } from './CompanyCardShell';
import type { CompanyView } from './CompanyViewToggle';

type CompanySearchCardProps = {
    company: CompanySummary;
    view: CompanyView;
    onSelect: (company: CompanySummary) => void;
};

function ContactDetails({ company }: { company: CompanySummary }) {
    return (
        <div className="flex min-w-0 flex-wrap items-center gap-x-[1.04vw] gap-y-[0.56vh] type-xs text-brand">
            <p className="flex min-w-0 items-center gap-[0.31vw]">
                <Mail aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">
                    Email: {company.contactEmail || 'Not provided'}
                </span>
            </p>
            <p className="flex min-w-0 items-center gap-[0.31vw]">
                <Globe aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">
                    Website: {company.website || 'Not provided'}
                </span>
            </p>
            <p className="flex shrink-0 items-center gap-[0.31vw]">
                <Phone aria-hidden="true" className="size-4" />
                {company.phone}
            </p>
        </div>
    );
}

export default function CompanySearchCard({
    company,
    view,
    onSelect,
}: CompanySearchCardProps) {
    if (view === 'list') {
        return (
            <article className="relative flex min-h-[19.9vh] max-w-[54.69vw] items-center gap-[1.25vw] rounded-[30px] bg-white px-[2.29vw] py-[2.314vh] text-left leading-relaxed shadow-sm transition">
                <CompanyAvatar
                    name={company.companyName}
                    photoUrl={company.companyPhoto}
                    size={72}
                />

                <div className="min-w-0 flex-1">
                    <h2 className="truncate type-md text-ink">
                        {company.companyName}
                    </h2>
                    <p className="mt-[0.56vh] truncate type-sm text-ink-placeholder">
                        Company Description:{' '}
                        {company.companyDescription || 'Not provided'}
                    </p>
                    <div className="mt-[1.48vh]">
                        <ContactDetails company={company} />
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => onSelect(company)}
                    aria-label={`View details for ${company.companyName}`}
                    className="flex h-[4.07vh] w-[8.125vw] items-center justify-center gap-[0.5vw] rounded-[15px] border border-brand type-sm text-brand hover:bg-brand/10"
                >
                    view detail
                    <ArrowRight aria-hidden="true" size={15} />
                </button>
            </article>
        );
    }

    return (
        <article className={companyCardClassName}>
            <div className="min-w-0">
                <div className="flex items-start justify-between gap-[0.83vw]">
                    <h2 className="min-w-0 truncate type-md !font-[700] text-ink">
                        {company.companyName}
                    </h2>
                    <CompanyAvatar
                        name={company.companyName}
                        photoUrl={company.companyPhoto}
                        size={52}
                    />
                </div>

                <p className="mt-[1.11vh] line-clamp-2 type-sm leading-relaxed text-ink-soft">
                    <span className="!font-[600] text-ink">
                        Company Description:{' '}
                    </span>
                    {company.companyDescription || 'Not provided'}
                </p>

                <div className="mt-[1.48vh] border-t border-brand/50 pt-[1.48vh]">
                    <ContactDetails company={company} />
                </div>
            </div>

            <button
                type="button"
                onClick={() => onSelect(company)}
                aria-label={`View details for ${company.companyName}`}
                className="ml-auto flex h-[4.07vh] min-w-[5.2vw] items-center justify-center rounded-status bg-brand px-[0.83vw] type-sm !font-[500] text-white transition-colors hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
                Details
            </button>
        </article>
    );
}
