'use client';
import React from 'react';

export default function CompanyCard() {
    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row gap-6">
            {/* Left Profile Info */}
            <div className="flex flex-col items-center text-center md:w-1/3 border-r-0 md:border-r border-gray-100 pr-0 md:pr-6">
                <div className="w-20 h-20 bg-amber-400 rounded-full flex items-center justify-center font-bold text-red-600 text-2xl shadow-inner mb-3">
                    CP
                </div>
                <h2 className="text-xl font-bold text-gray-900">MangoDB</h2>
                <span className="text-xs text-gray-500 mb-4">MangoDB COOP</span>

                <div className="text-xs text-gray-600 space-y-1">
                    <p>mongoDB@org.com</p>
                    <p>mangodb.com</p>
                    <p>081-234-5678</p>
                </div>
            </div>

            {/* Right Form Field Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Company Description
                    </label>
                    <textarea className="w-full h-24 p-2 text-xs border border-[#497B93] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#497B93] resize-none" />
                </div>
                {/* <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Company Account Type
                    </label>
                    <textarea className="w-full h-24 p-2 text-xs border border-[#497B93] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#497B93] resize-none" />
                </div> */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Company Warranty Policy
                    </label>
                    <textarea className="w-full h-24 p-2 text-xs border border-[#497B93] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#497B93] resize-none" />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Company Address
                    </label>
                    <textarea className="w-full h-24 p-2 text-xs border border-[#497B93] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#497B93] resize-none" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Company Service Term
                    </label>
                    <textarea className="w-full h-24 p-2 text-xs border border-[#497B93] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#497B93] resize-none" />
                </div>
            </div>
        </div>
    );
}
