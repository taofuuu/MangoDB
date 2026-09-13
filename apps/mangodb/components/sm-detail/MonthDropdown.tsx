'use client';
import { useState } from 'react';

type MonthDropdownProps = {
    value: string;
    onChange: (value: string) => void;
};

export const months = [
    { label: 'January', value: '1' },
    { label: 'February', value: '2' },
    { label: 'March', value: '3' },
    { label: 'April', value: '4' },
    { label: 'May', value: '5' },
    { label: 'June', value: '6' },
    { label: 'July', value: '7' },
    { label: 'August', value: '8' },
    { label: 'September', value: '9' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' },
];

// The stored value is the month number, so anything rendering a saved date
// needs the label back. One list, both directions.
export function monthLabel(value?: string): string {
    return months.find((month) => month.value === value)?.label ?? '';
}

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
                    {months.find((month) => month.value === value)?.label ||
                        'Select month'}
                </span>

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-md text-[#757575]">
                    ▼
                </span>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                    <div className="custom-scrollbar h-50 overflow-y-auto">
                        {months.map((month) => (
                            <button
                                type="button"
                                key={month.value}
                                onClick={() => {
                                    onChange(month.value);
                                    setOpen(false);
                                }}
                                className="block w-full px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
                            >
                                {month.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
