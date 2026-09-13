'use client';

import React from 'react';
import Link from 'next/link';
import type { AccountType, CompanyProfile } from '@mangodb/shared';
import RoleTags from '../ui/RoleTags';
import Tag from '../ui/Tag';

export interface CompanyCardData {
    name: string;
    email: string;
    website: string;
    phone: string;
    description: string;
    address: string;
    // The tags themselves, not a joined string: they are chips on screen, the
    // same ones the edit form shows.
    companyType: string[];
    warrantyPolicy: string;
    serviceTerm: string;
    accountType: AccountType;
}

interface CompanyCardProps {
    data: CompanyCardData;
}

// The profile's nullable columns become "Not provided" here rather than
// rendering an empty line, which reads as a loading glitch.
export function toCompanyCardData(profile: CompanyProfile): CompanyCardData {
    return {
        name: profile.companyName,
        email: profile.contactEmail ?? 'Not provided',
        website: profile.website ?? 'Not provided',
        phone: profile.phone,
        description: profile.companyDescription ?? 'No description provided.',
        address: profile.address ?? 'Not provided',
        companyType: profile.companyType,
        warrantyPolicy: profile.warrantyPolicy ?? 'Not provided',
        serviceTerm: profile.serviceTerm ?? 'Not provided',
        accountType: profile.accountType,
    };
}

// Plain text under a label, not a read-only textarea. A textarea takes focus,
// draws an input border and is announced as "textbox", which is what made a
// page for reading feel like a form for filling in.
function Field({
    label,
    value,
    className = '',
}: {
    label: string;
    value: string;
    className?: string;
}) {
    return (
        <div className={className}>
            <p className="type-xs !font-[600] text-ink-soft">{label}</p>
            <p className="mt-1 type-sm whitespace-pre-line text-ink">{value}</p>
        </div>
    );
}

export default function CompanyCard({ data }: CompanyCardProps) {
    return (
        <div className="flex h-[420px] w-full flex-col overflow-hidden rounded-popup border border-line bg-white p-8 shadow-sm md:flex-row md:gap-8">
            {/* Who the company is. Fixed rather than scrolled: it is short
                enough to always fit, and scrolling it along with the details
                is what pushed the phone number off the card. */}
            <div className="flex shrink-0 flex-col items-center justify-center border-line py-4 text-center md:w-1/3 md:border-r md:pr-8">
                <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-accent-bright text-3xl font-bold text-avatar-initials shadow-inner">
                    CP
                </div>

                <h2 className="mb-3 text-2xl font-bold tracking-tight text-ink">
                    {data.name}
                </h2>

                <RoleTags
                    accountType={data.accountType}
                    className="mb-3 gap-2"
                    tagClassName="h-[2.6vh] min-h-[24px] px-3 type-xs"
                />

                <div className="type-xs text-ink-soft space-y-1">
                    <p>{data.email}</p>
                    <p>{data.website}</p>
                    <p>{data.phone}</p>
                </div>
            </div>

            {/* The details, and the only thing that scrolls. Edit sits under
                the scroll rather than inside it, so it is always reachable. */}
            <div className="flex min-h-0 w-full flex-col md:w-2/3">
                <div className="view-profile-scrollbar min-h-0 flex-1 overflow-y-auto pr-2">
                    <div className="grid w-full grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                        <Field
                            label="Company Description"
                            value={data.description}
                        />

                        <div>
                            <p className="type-xs !font-[600] text-ink-soft">
                                Company Type
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2">
                                {data.companyType.length > 0 ? (
                                    data.companyType.map((type) => (
                                        <Tag
                                            key={type}
                                            label={type}
                                            className="h-[2.6vh] min-h-[24px] bg-fill-muted px-3 type-xs text-ink"
                                        />
                                    ))
                                ) : (
                                    <p className="type-sm text-ink">
                                        Not specified
                                    </p>
                                )}
                            </div>
                        </div>

                        <Field
                            label="Company Service Term"
                            value={data.serviceTerm}
                        />
                        <Field
                            label="Company Warranty Policy"
                            value={data.warrantyPolicy}
                        />
                        <Field
                            label="Company Address"
                            value={data.address}
                            className="md:col-span-2"
                        />
                    </div>
                </div>

                <div className="flex shrink-0 justify-end pt-4">
                    <Link
                        href="/profile/edit"
                        className="rounded-button bg-brand px-6 py-1.5 type-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-dark"
                    >
                        Edit
                    </Link>
                </div>
            </div>
        </div>
    );
}
