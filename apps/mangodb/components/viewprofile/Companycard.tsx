'use client';

import React from 'react';
import Link from 'next/link';
import type { AccountType, CompanyProfile } from '@mangodb/shared';
import RoleTags from '../ui/RoleTags';

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

// The profile's nullable columns become "Not provided" here rather than
// rendering an empty textarea, which reads as a loading glitch.
export function toCompanyCardData(profile: CompanyProfile): CompanyCardData {
    return {
        name: profile.companyName,
        email: profile.contactEmail ?? 'Not provided',
        website: profile.website ?? 'Not provided',
        phone: profile.phone,
        description: profile.companyDescription ?? 'No description provided.',
        address: profile.address ?? 'Not provided',
        companyType:
            profile.companyType.length > 0
                ? profile.companyType.join(', ')
                : 'Not specified',
        warrantyPolicy: profile.warrantyPolicy ?? 'Not provided',
        serviceTerm: profile.serviceTerm ?? 'Not provided',
        accountType: profile.accountType,
    };
}

// One class for all five read-only fields.
const FIELD =
    'w-full h-20 p-3 type-xs border border-brand/50 rounded-input bg-white text-gray-700 focus:outline-none resize-none cursor-default';
const LABEL = 'block type-sm !font-[600] text-gray-800 mb-1';

export default function CompanyCard({ data }: CompanyCardProps) {
    return (
        <div className="bg-white rounded-popup p-8 border border-line shadow-sm flex flex-col relative w-full h-[420px] overflow-hidden">
            {/* A fixed card height with everything scrolling inside, so the
                four panels on the page line up instead of one stretching the
                row. Edit is inside the scroll rather than pinned under it:
                pinning cost 46px of visible height, which was enough to cut
                the phone number off the left column. */}
            <div className="view-profile-scrollbar flex flex-1 flex-col justify-between overflow-y-auto pr-2">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Profile Info */}
                    <div className="flex flex-col items-center text-center md:w-1/3 border-r-0 md:border-r border-line pr-0 md:pr-8 justify-center py-4">
                        {/* Logo */}
                        <div className="w-24 h-24 bg-accent-bright rounded-full flex items-center justify-center font-bold text-avatar-initials text-3xl shadow-inner mb-4">
                            CP
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-3">
                            {data.name}
                        </h2>

                        <RoleTags
                            accountType={data.accountType}
                            className="mb-3 gap-2"
                            tagClassName="h-[2.6vh] min-h-[24px] px-3 type-xs"
                        />

                        {/* Contact Info */}
                        <div className="type-xs text-gray-600 space-y-1">
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
                                    className={LABEL}
                                >
                                    Company Description
                                </label>
                                <textarea
                                    id="company-description"
                                    readOnly
                                    value={data.description}
                                    className={FIELD}
                                />
                            </div>

                            <div>
                                <label htmlFor="company-type" className={LABEL}>
                                    Company Type
                                </label>
                                <textarea
                                    id="company-type"
                                    readOnly
                                    value={data.companyType}
                                    className={FIELD}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="company-service-term"
                                    className={LABEL}
                                >
                                    Company Service Term
                                </label>
                                <textarea
                                    id="company-service-term"
                                    readOnly
                                    value={data.serviceTerm}
                                    className={FIELD}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="company-warranty-policy"
                                    className={LABEL}
                                >
                                    Company Warranty Policy
                                </label>
                                <textarea
                                    id="company-warranty-policy"
                                    readOnly
                                    value={data.warrantyPolicy}
                                    className={FIELD}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label
                                    htmlFor="company-address"
                                    className={LABEL}
                                >
                                    Company Address
                                </label>
                                <textarea
                                    id="company-address"
                                    readOnly
                                    value={data.address}
                                    className={FIELD}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end pt-4">
                    <Link
                        href="/profile/edit"
                        className="px-6 py-1.5 bg-brand hover:bg-brand-dark text-white type-xs font-medium rounded-button transition-colors shadow-sm"
                    >
                        Edit
                    </Link>
                </div>
            </div>
        </div>
    );
}
