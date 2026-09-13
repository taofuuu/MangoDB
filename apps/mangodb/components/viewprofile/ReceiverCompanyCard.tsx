'use client';

import React from 'react';
import Link from 'next/link';
import type { AccountType, CompanyProfile } from '@mangodb/shared';
import RoleTags from '../ui/RoleTags';

export interface ReceiverCompanyCardData {
    name: string;
    email: string;
    website: string;
    phone: string;
    description: string;
    companyType: string;
    address: string;
    accountType: AccountType;
}

interface ReceiverCompanyCardProps {
    data: ReceiverCompanyCardData;
}

// The profile's nullable columns become "Not provided" here rather than
// rendering an empty textarea, which reads as a loading glitch.
export function toReceiverCompanyCardData(
    profile: CompanyProfile,
): ReceiverCompanyCardData {
    return {
        name: profile.companyName,
        email: profile.contactEmail ?? 'Not provided',
        website: profile.website ?? 'Not provided',
        phone: profile.phone,
        description: profile.companyDescription ?? 'No description provided.',
        companyType:
            profile.companyType.length > 0
                ? profile.companyType.join(', ')
                : 'Not specified',
        address: profile.address ?? 'Not provided',
        accountType: profile.accountType,
    };
}

export default function ReceiverCompanyCard({
    data,
}: ReceiverCompanyCardProps) {
    return (
        <div className="bg-white rounded-popup p-8 border border-line shadow-sm flex flex-col justify-between w-full h-full">
            <div className="view-profile-scrollbar flex-1 overflow-y-auto pr-2">
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center mb-5">
                    <div className="w-20 h-20 bg-accent-bright rounded-full flex items-center justify-center !font-bold text-avatar-initials type-lg shadow-inner mb-3">
                        CP
                    </div>
                    <h2 className="type-md !font-bold text-gray-900 tracking-tight mb-3">
                        {data.name}
                    </h2>

                    <RoleTags
                        accountType={data.accountType}
                        className="mb-3 gap-2"
                        tagClassName="h-[2.6vh] min-h-[24px] px-3 type-xs"
                    />

                    <div className="type-xs text-gray-600 space-y-0.5">
                        <p>{data.email}</p>
                        <p>{data.website}</p>
                        <p>{data.phone}</p>
                    </div>
                </div>

                {/* Form Fields Stack */}
                <div className="flex flex-col gap-3">
                    <div>
                        <label
                            htmlFor="company-description"
                            className="block type-sm !font-[600] text-gray-800 mb-1"
                        >
                            Company Description
                        </label>
                        <textarea
                            id="company-description"
                            readOnly
                            value={data.description}
                            className="w-full h-28 p-3 type-xs border border-brand/50 rounded-input bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="company-type"
                            className="block type-sm !font-[600] text-gray-800 mb-1"
                        >
                            Company Type
                        </label>
                        <textarea
                            id="company-type"
                            readOnly
                            value={data.companyType}
                            className="w-full h-20 p-3 type-xs border border-brand/50 rounded-input bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="company-address"
                            className="block type-sm !font-[600] text-gray-800 mb-1"
                        >
                            Company Address
                        </label>
                        <textarea
                            id="company-address"
                            readOnly
                            value={data.address}
                            className="w-full h-20 p-3 type-xs border border-brand/50 rounded-input bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                        />
                    </div>
                </div>
            </div>

            {/* Edit Button. Outside the scroll area, like the provider card's,
                so it stays on the bottom edge rather than below the fold. */}
            <div className="flex shrink-0 justify-end pt-4">
                <Link
                    href="/profile/edit"
                    className="px-6 py-1.5 bg-brand hover:bg-brand-dark text-white type-xs !font-medium rounded-button transition-colors shadow-sm"
                >
                    Edit
                </Link>
            </div>
        </div>
    );
}
