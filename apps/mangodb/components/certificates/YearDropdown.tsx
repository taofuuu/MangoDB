'use client';

import Dropdown from '@/components/ui/Dropdown';

type YearDropdownProps = {
    value: string;
    onChange: (value: string) => void;
    minYear: number;
    maxYear: number;
};

// A certificate's issue or expiry year, from minYear to maxYear.
export default function YearDropdown({
    value,
    onChange,
    minYear,
    maxYear,
}: YearDropdownProps) {
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => {
        const year = String(minYear + index);
        return { label: year, value: year };
    });

    return (
        <Dropdown
            value={value}
            options={years}
            onChange={onChange}
            label="Year"
            placeholder="Select year"
        />
    );
}
