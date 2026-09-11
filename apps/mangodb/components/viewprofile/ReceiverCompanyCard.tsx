'use client';

import React from 'react';
import Link from 'next/link';

interface ReceiverCompanyCardProps {
    data?: {
        name: string;
        subName: string;
        email: string;
        website: string;
        phone: string;
        description: string;
        type: string;
        address: string;
    };
}

const defaultMockData = {
    name: 'MangoDB COOP',
    subName: 'MangoDB COOP',
    email: 'mongoDB@org.com',
    website: 'mangodb.com',
    phone: '081-234-5678',
    description:
        'Leading provider of database solutions and infrastructure services.',
    type: 'Cooperative / Enterprise',
    address: '123 Tech Park, Tower A, Bangkok, Thailand 10110',
};

export default function ReceiverCompanyCard({
    data = defaultMockData,
}: ReceiverCompanyCardProps) {
    return (
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs flex flex-col justify-between w-full h-full font-sans">
            <div>
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center mb-5">
                    <div className="w-20 h-20 bg-[#FFB800] rounded-full flex items-center justify-center font-bold text-[#E53E3E] text-2xl shadow-inner mb-3">
                        CP
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                        {data.name}
                    </h2>
                    <span className="text-xs text-gray-400 font-normal mt-0.5 mb-3">
                        {data.subName}
                    </span>

                    <div className="text-xs text-gray-600 space-y-0.5 font-normal">
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
                            className="block text-xs font-medium text-gray-700 mb-1"
                        >
                            Company Description
                        </label>
                        <textarea
                            id="company-description"
                            readOnly
                            value={data.description}
                            className="w-full h-28 p-3 text-xs border border-[#497B93] rounded-xl bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="company-type"
                            className="block text-xs font-medium text-gray-700 mb-1"
                        >
                            Company Type
                        </label>
                        <textarea
                            id="company-type"
                            readOnly
                            value={data.type}
                            className="w-full h-20 p-3 text-xs border border-[#497B93] rounded-xl bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="company-address"
                            className="block text-xs font-medium text-gray-700 mb-1"
                        >
                            Company Address
                        </label>
                        <textarea
                            id="company-address"
                            readOnly
                            value={data.address}
                            className="w-full h-20 p-3 text-xs border border-[#497B93] rounded-xl bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                        />
                    </div>
                </div>
            </div>

            {/* Edit Button */}
            <div className="flex justify-end mt-4">
                <Link
                    href="/profile/edit"
                    className="px-5 py-1.5 bg-[#497B93] hover:bg-[#386277] text-white text-xs font-medium rounded-lg transition-colors shadow-xs"
                >
                    Edit
                </Link>
            </div>
        </div>
    );
}
