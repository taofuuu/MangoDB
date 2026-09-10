'use client';

import { useState } from 'react';

type CategoryFilterProps = {
    value: string;
    onChange: (value: string) => void;
    options: string[];
};

export default function CategoryFilter({
    value,
    onChange,
    options,
}: CategoryFilterProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className="flex items-center gap-[1.2vw] px-[0.4vw] py-[0.5vh] text-lg !font-[500] text-[#171717]"
            >
                {value}

                <span className="text-md text-[#171717]">▼</span>
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-1 w-max min-w-full rounded-md border border-gray-200 bg-white shadow-lg">
                    {options.map((option) => (
                        <button
                            type="button"
                            key={option}
                            onClick={() => {
                                onChange(option);
                                setOpen(false);
                            }}
                            className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100"
                        >
                            {option}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
