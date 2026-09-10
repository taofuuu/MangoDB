'use client';

import React from 'react';
import Link from 'next/link';

export default function ReceiverCompanyCard() {
    return (
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs flex flex-col justify-between w-full h-full font-sans">
            <div>
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center mb-5">
                    <div className="w-20 h-20 bg-[#FFB800] rounded-full flex items-center justify-center font-bold text-[#E53E3E] text-2xl shadow-inner mb-3">
                        CP
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                        MangoDB COOP
                    </h2>
                    <span className="text-xs text-gray-400 font-normal mt-0.5 mb-3">
                        MangoDB COOP
                    </span>

                    <div className="text-xs text-gray-600 space-y-0.5 font-normal">
                        <p>mongoDB@org.com</p>
                        <p>mangodb.com</p>
                        <p>081-234-5678</p>
                    </div>
                </div>

                {/* Form Fields Stack */}
                <div className="flex flex-col gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Company Description
                        </label>
                        <textarea
                            readOnly
                            value=""
                            className="w-full h-28 p-3 text-xs border border-[#497B93] rounded-xl bg-white focus:outline-none resize-none cursor-default"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Company Type
                        </label>
                        <textarea
                            readOnly
                            value=""
                            className="w-full h-20 p-3 text-xs border border-[#497B93] rounded-xl bg-white focus:outline-none resize-none cursor-default"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Company Address
                        </label>
                        <textarea
                            readOnly
                            value=""
                            className="w-full h-20 p-3 text-xs border border-[#497B93] rounded-xl bg-white focus:outline-none resize-none cursor-default"
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
