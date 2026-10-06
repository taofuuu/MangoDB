'use client';

import { useState } from 'react';

// Order-by is a placeholder control: the backend's listServices always
// orders by createdAt desc, listingId desc (see service.controller.ts). No
// orderBy param exists yet, so selecting an option here does nothing until
// that's added — kept visible to match the mockup, disabled until then.
const ORDER_OPTIONS = ['Newest', 'Budget: low to high', 'Budget: high to low'];

export function SearchServicesBar({
    onSearch,
}: {
    onSearch: (q: string) => void;
}) {
    const [value, setValue] = useState('');

    function submit(e: React.FormEvent) {
        e.preventDefault();
        onSearch(value);
    }

    return (
        <form
            onSubmit={submit}
            className="flex items-center justify-between gap-4"
        >
            <input
                type="search"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Search"
                className="type-sm w-full max-w-md rounded-full border border-[var(--color-line)] bg-[var(--color-surface-white)] px-5 py-2 text-[var(--color-ink)] shadow-card outline-none placeholder:text-[var(--color-ink-placeholder)] focus:border-[var(--color-brand)]"
            />
            <label className="flex items-center gap-2 type-xs text-[var(--color-ink-soft)]">
                Order by:
                <select
                    disabled
                    title="Not available yet — the API doesn't support sorting"
                    className="type-xs rounded-full border border-[var(--color-line)] bg-[var(--color-surface-white)] px-3 py-1.5 text-[var(--color-ink-placeholder)] shadow-card"
                >
                    {ORDER_OPTIONS.map((opt) => (
                        <option key={opt}>{opt}</option>
                    ))}
                </select>
            </label>
        </form>
    );
}
