'use client';

import React from 'react';
import Link from 'next/link';
import type { AccountType, CompanyProfile } from '@mangodb/shared';
import RoleTags from '../ui/RoleTags';
import Tag from '../ui/Tag';

export interface ReceiverCompanyCardData {
    name: string;
    email: string;
    website: string;
    phone: string;
    description: string;
    // The tags themselves, not a joined string — chips on screen, like the
    // provider card and the edit form.
    companyType: string[];
    address: string;
    accountType: AccountType;
}

interface ReceiverCompanyCardProps {
    data: ReceiverCompanyCardData;
}

// The profile's nullable columns become "Not provided" here rather than
// rendering an empty line, which reads as a loading glitch.
export function toReceiverCompanyCardData(
    profile: CompanyProfile,
): ReceiverCompanyCardData {
    return {
        name: profile.companyName,
        email: profile.contactEmail ?? 'Not provided',
        website: profile.website ?? 'Not provided',
        phone: profile.phone,
        description: profile.companyDescription ?? 'No description provided.',
        companyType: profile.companyType,
        address: profile.address ?? 'Not provided',
        accountType: profile.accountType,
    };
}

// Plain text under a label. Same reason as the provider card: a read-only
// textarea takes focus and draws an input border, so a page for reading looked
// like a form for filling in.
function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="type-xs !font-[600] text-ink-soft">{label}</p>
            <p className="mt-1 type-sm whitespace-pre-line text-ink">{value}</p>
        </div>
    );
}

export default function ReceiverCompanyCard({
    data,
}: ReceiverCompanyCardProps) {
    return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-popup border border-line bg-white p-8 shadow-sm">
            {/* Who the company is. Fixed, like the provider card's. */}
            <div className="mb-5 flex shrink-0 flex-col items-center text-center">
                <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-accent-bright type-lg !font-bold text-avatar-initials shadow-inner">
                    CP
                </div>

                <h2 className="mb-3 type-md !font-bold tracking-tight text-ink">
                    {data.name}
                </h2>

                <RoleTags
                    accountType={data.accountType}
                    className="mb-3 gap-2"
                    tagClassName="h-[2.6vh] min-h-[24px] px-3 type-xs"
                />

                <div className="type-xs text-ink-soft space-y-0.5">
                    <p>{data.email}</p>
                    <p>{data.website}</p>
                    <p>{data.phone}</p>
                </div>
            </div>

            {/* The details, and the only thing that scrolls. */}
            <div className="view-profile-scrollbar min-h-0 flex-1 overflow-y-auto pr-2">
                <div className="flex flex-col gap-4">
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

                    <Field label="Company Address" value={data.address} />
                </div>
            </div>

            <div className="flex shrink-0 justify-end pt-4">
                <Link
                    href="/profile/edit"
                    className="rounded-button bg-brand px-6 py-1.5 type-xs !font-medium text-white shadow-sm transition-colors hover:bg-brand-dark"
                >
                    Edit
                </Link>
            </div>
        </div>
    );
}
