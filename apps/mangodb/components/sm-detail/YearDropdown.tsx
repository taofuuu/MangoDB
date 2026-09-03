'use client';

import { useState } from 'react';

type YearDropdownProps = {
    value: string;
    onChange: (value: string) => void;
};

export default function YearDropdown({ value, onChange }: YearDropdownProps) {
    const [open, setOpen] = useState(false);
    const startYear = 2020;
    const endYear = 2035;
    const years = Array.from(
        { length: endYear - startYear + 1 },
        (_, index) => startYear + index,
    );

    return (
        <div className="relative w-full">
            {/* Button */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="h-[4.89vh] w-[19.79vw] px-1.5 flex w-full items-center justify-between rounded-input border border-[#3F6B80] bg-[#FFFFFF]/80"
            >
                <span
                    className={
                        value ? 'text-black text-sm' : 'text-[#D6D6D6] text-sm'
                    }
                >
                    {value || 'Select year'}
                </span>

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-md text-[#757575]">
                    ▼
                </span>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute left-0 top-full z-50 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                    <div className="custom-scrollbar h-50 overflow-y-auto">
                        {years.map((year) => (
                            <button
                                type="button"
                                key={year}
                                onClick={() => {
                                    onChange(String(year));
                                    setOpen(false);
                                }}
                                className="block w-full px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
