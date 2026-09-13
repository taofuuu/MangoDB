'use client';

import React from 'react';
import Link from 'next/link';
import type { AccountType, CompanyProfile } from '@mangodb/shared';
import Tag from '../ui/Tag';

export interface CompanyCardData {
    name: string;
    email: string;
    website: string;
    phone: string;
    description: string;
    address: string;
    companyType: string;
    warrantyPolicy: string;
    serviceTerm: string;
    accountType: AccountType;
}

interface CompanyCardProps {
    data: CompanyCardData;
}

const ROLES: Record<AccountType, string[]> = {
    PROVIDER: ['Provider'],
    RECEIVER: ['Receiver'],
    BOTH: ['Provider', 'Receiver'],
    // An administrator offers and requests nothing, so it wears no tag. The
    // key still has to be here: Record<AccountType, ...> demands every one.
    ADMIN: [],
};

const ROLE_FILL: Record<string, string> = {
    Provider: 'bg-[#66A6C5] text-white',
    Receiver: 'bg-[#D36B60] text-white',
};

// The profile's nullable columns become "Not provided" here rather than
// rendering an empty textarea, which reads as a loading glitch.
export function toCompanyCardData(profile: CompanyProfile): CompanyCardData {
    return {
        name: profile.company_name,
        email: profile.contact_email ?? 'Not provided',
        website: profile.website ?? 'Not provided',
        phone: profile.phone,
        description: profile.company_description ?? 'No description provided.',
        address: profile.address ?? 'Not provided',
        companyType:
            profile.company_type.length > 0
                ? profile.company_type.join(', ')
                : 'Not specified',
        warrantyPolicy: profile.warranty_policy ?? 'Not provided',
        serviceTerm: profile.service_term ?? 'Not provided',
        accountType: profile.account_type ?? 'Not provided',
    };
}

export default function CompanyCard({ data }: CompanyCardProps) {
    return (
        <div className="bg-white rounded-[30px] p-8 border border-[#C4C4C4] shadow-sm flex flex-col relative w-full h-[420px] overflow-hidden">
            <div className="flex-1 flex flex-col justify-between overflow-y-auto pr-2 view-profile-scrollbar">
                {' '}
                <div className="flex flex-col md:flex-row gap-8">
                    {' '}
                    {/* Left Profile Info */}
                    <div className="flex flex-col items-center text-center md:w-1/3 border-r-0 md:border-r border-[#BAB8B8] pr-0 md:pr-8 justify-center py-4">
                        {/* Logo */}
                        <div className="w-24 h-24 bg-[#FFC107] rounded-full flex items-center justify-center font-bold text-[#E53E3E] text-3xl shadow-inner mb-4">
                            CP
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-6">
                            {data.name}
                        </h2>

                        {/* Contact Info */}
                        <div className="text-xs text-gray-600 space-y-1">
                            <div className="mt-[4px] pb-[10px] flex gap-[15px]">
                                {ROLES[data.accountType].map((role) => (
                                    <Tag
                                        key={role}
                                        label={role}
                                        className={` text-sm h-[3.5px] w-[8 px] ${ROLE_FILL[role]}`}
                                    />
                                ))}
                            </div>
                            <p>{data.email}</p>
                            <p>{data.website}</p>
                            <p>{data.phone}</p>
                        </div>
                    </div>
                    <div className="w-full md:w-2/3 pb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 w-full">
                            {/* Right Form Field Grids - Match Figma Layout */}
                            <div>
                                <label
                                    htmlFor="company-description"
                                    className="block text-sm font-semibold text-gray-800 mb-1"
                                >
                                    Company Description
                                </label>
                                <textarea
                                    id="company-description"
                                    readOnly
                                    value={data.description}
                                    className="w-full h-20 p-3 text-xs border border-[#497B93]/50 rounded-[6px] bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="company-type"
                                    className="block text-sm font-semibold text-gray-800 mb-1"
                                >
                                    Company Type
                                </label>
                                <textarea
                                    id="company-type"
                                    readOnly
                                    value={data.companyType}
                                    className="w-full h-20 p-3 text-xs border border-[#497B93]/50 rounded-[6px] bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="company-service-term"
                                    className="block text-sm font-semibold text-gray-800 mb-1"
                                >
                                    Company Service Term
                                </label>
                                <textarea
                                    id="company-service-term"
                                    readOnly
                                    value={data.serviceTerm}
                                    className="w-full h-20 p-3 text-xs border border-[#497B93]/50 rounded-[6px] bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="company-warranty-policy"
                                    className="block text-sm font-semibold text-gray-800 mb-1"
                                >
                                    Company Warranty Policy
                                </label>
                                <textarea
                                    id="company-warranty-policy"
                                    readOnly
                                    value={data.warrantyPolicy}
                                    className="w-full h-20 p-3 text-xs border border-[#497B93]/50 rounded-[6px] bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label
                                    htmlFor="company-address"
                                    className="block text-xs font-semibold text-gray-800 mb-1"
                                >
                                    Company Address
                                </label>
                                <textarea
                                    id="company-address"
                                    readOnly
                                    value={data.address}
                                    className="w-full h-20 p-3 text-xs border border-[#497B93]/50 rounded-[6px] bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                {/* Edit Button (Bottom Right) */}
                <div className="flex justify-end">
                    <Link
                        href="/profile/edit"
                        className="px-6 py-1.5 bg-[#497B93] hover:bg-[#3b6478] text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                    >
                        Edit
                    </Link>
                </div>
            </div>
        </div>
    );
}
