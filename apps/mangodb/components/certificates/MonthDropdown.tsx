'use client';

import Dropdown from '@/components/ui/Dropdown';
import { months } from '@/lib/dates';

type MonthDropdownProps = {
    value: string;
    onChange: (value: string) => void;
};

// A certificate's issue or expiry month. The value is the month number.
export default function MonthDropdown({ value, onChange }: MonthDropdownProps) {
    return (
        <Dropdown
            value={value}
            options={months}
            onChange={onChange}
            label="Month"
            placeholder="Select month"
        />
    );
}
