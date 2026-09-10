'use client';

import React from 'react';
import Link from 'next/link';

export default function CompanyCard() {
    return (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col relative w-full">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Left Profile Info */}
                <div className="flex flex-col items-center text-center md:w-1/3 border-r-0 md:border-r border-gray-200 pr-0 md:pr-8 justify-center py-4">
                    {/* Logo */}
                    <div className="w-24 h-24 bg-[#FFC107] rounded-full flex items-center justify-center font-bold text-[#E53E3E] text-3xl shadow-inner mb-4">
                        CP
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                        MangoDB
                    </h2>
                    <span className="text-xs text-gray-500 mb-6 font-medium">
                        MangoDB COOP
                    </span>

                    {/* Contact Info */}
                    <div className="text-xs text-gray-600 space-y-1">
                        <p>mongoDB@org.com</p>
                        <p>mangodb.com</p>
                        <p>081-234-5678</p>
                    </div>
                </div>

                {/* Right Form Field Grids - Match Figma Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 pb-8">
                    {/* Column 1 (Left) */}
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-1">
                                Company Description
                            </label>
                            <textarea
                                readOnly
                                value=""
                                className="w-full h-44 p-3 text-xs border border-[#497B93]/50 rounded-xl bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-1">
                                Company Address
                            </label>
                            <textarea
                                readOnly
                                value=""
                                className="w-full h-20 p-3 text-xs border border-[#497B93]/50 rounded-xl bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                            />
                        </div>
                    </div>

                    {/* Column 2 (Right) */}
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-1">
                                Company Type
                            </label>
                            <textarea
                                readOnly
                                value=""
                                className="w-full h-20 p-3 text-xs border border-[#497B93]/50 rounded-xl bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-1">
                                Company Warranty Policy
                            </label>
                            <textarea
                                readOnly
                                value=""
                                className="w-full h-20 p-3 text-xs border border-[#497B93]/50 rounded-xl bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-1">
                                Company Service Term
                            </label>
                            <textarea
                                readOnly
                                value=""
                                className="w-full h-20 p-3 text-xs border border-[#497B93]/50 rounded-xl bg-white text-gray-700 focus:outline-none resize-none cursor-default"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Button (Bottom Right) */}
            <div className="flex justify-end absolute bottom-6 right-8">
                <Link
                    href="/profile/edit"
                    className="px-6 py-1.5 bg-[#497B93] hover:bg-[#3b6478] text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                >
                    Edit
                </Link>
            </div>
        </div>
    );
}
