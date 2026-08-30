'use client';
import { useState } from 'react';

type MonthDropdownProps = {
    value: string;
    onChange: (value: string) => void;
};

const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

export default function MonthDropdown({ value, onChange }: MonthDropdownProps) {
    const [open, setOpen] = useState(false);

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
                    {value || 'Select month'}
                </span>

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-md text-[#757575]">
                    ▼
                </span>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                    <div className="custom-scrollbar h-50 overflow-y-auto">
                        {months.map((month, index) => (
                            <button
                                type="button"
                                key={month}
                                onClick={() => {
                                    onChange(String(month));
                                    setOpen(false);
                                }}
                                className="block w-full px-3 py-2 text-sm hover:bg-gray-100"
                            >
                                {month}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
