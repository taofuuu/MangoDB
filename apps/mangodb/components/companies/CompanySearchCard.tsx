'use client';

import type { CompanySummary } from '@mangodb/shared';
import { ArrowRight, Globe, Mail, Phone } from 'lucide-react';
import CompanyAvatar from '@/components/viewprofile/CompanyAvatar';

type CompanySearchCardProps = {
    company: CompanySummary;
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
    onSelect,
}: CompanySearchCardProps) {
    return (
        <article className="relative flex min-h-[19.9vh] max-w-full flex-wrap items-center gap-[1.25vw] rounded-[30px] bg-white px-[2.29vw] py-[2.314vh] text-left leading-relaxed shadow-sm transition lg:max-w-[54.69vw]">
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
                className="ml-auto flex h-10 min-w-[7rem] shrink-0 items-center justify-center gap-[0.5vw] rounded-[15px] border border-brand px-3 type-sm text-brand hover:bg-brand/10 sm:h-[4.07vh] sm:w-[8.125vw] sm:min-w-0 sm:px-0"
            >
                view detail
                <ArrowRight aria-hidden="true" size={15} />
            </button>
        </article>
    );
}
