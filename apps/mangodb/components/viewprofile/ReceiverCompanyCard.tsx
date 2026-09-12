'use client';

import React from 'react';
import Link from 'next/link';
import type { CompanyProfile } from '@mangodb/shared';

export interface ReceiverCompanyCardData {
    name: string;
    email: string;
    website: string;
    phone: string;
    description: string;
    type: string;
    address: string;
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
        name: profile.company_name,
        email: profile.contact_email ?? 'Not provided',
        website: profile.website ?? 'Not provided',
        phone: profile.phone,
        description: profile.company_description ?? 'No description provided.',
        type:
            profile.company_type.length > 0
                ? profile.company_type.join(', ')
                : 'Not specified',
        address: profile.address ?? 'Not provided',
    };
}

export default function ReceiverCompanyCard({
    data,
}: ReceiverCompanyCardProps) {
    return (
        <div className="bg-white rounded-popup p-6 border border-gray-200 shadow-xs flex flex-col justify-between w-full h-full font-sans">
            <div>
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center mb-5">
                    <div className="w-20 h-20 bg-[#FFB800] rounded-full flex items-center justify-center !font-bold text-[#E53E3E] text-lg shadow-inner mb-3">
                        CP
                    </div>
                    <h2 className="text-md !font-bold text-gray-900 tracking-tight mb-3">
                        {data.name}
                    </h2>

                    <div className="text-xs text-gray-600 space-y-0.5">
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
                            className="block text-xs !font-medium text-gray-700 mb-1"
                        >
                            Company Description
                        </label>
                        <textarea
                            id="company-description"
                            readOnly
                            value={data.description}
                            className="w-full h-28 p-3 text-xs border border-[#497B93] rounded-button bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="company-type"
                            className="block text-xs !font-medium text-gray-700 mb-1"
                        >
                            Company Type
                        </label>
                        <textarea
                            id="company-type"
                            readOnly
                            value={data.type}
                            className="w-full h-20 p-3 text-xs border border-[#497B93] rounded-button bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="company-address"
                            className="block text-xs !font-medium text-gray-700 mb-1"
                        >
                            Company Address
                        </label>
                        <textarea
                            id="company-address"
                            readOnly
                            value={data.address}
                            className="w-full h-20 p-3 text-xs border border-[#497B93] rounded-button bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                        />
                    </div>
                </div>
            </div>

            {/* Edit Button */}
            <div className="flex justify-end mt-4">
                <Link
                    href="/profile/edit"
                    className="px-5 py-1.5 bg-[#497B93] hover:bg-[#386277] text-white text-xs !font-medium rounded-button transition-colors shadow-xs"
                >
                    Edit
                </Link>
            </div>
        </div>
    );
}
