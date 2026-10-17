'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';
import type { ServiceSortOrder } from '@mangodb/shared';

const ORDER_OPTIONS: { value: ServiceSortOrder; label: string }[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'priceAsc', label: 'Budget: low to high' },
    { value: 'priceDesc', label: 'Budget: high to low' },
];

export default function SearchServicesBar({
    onSearch,
    orderBy,
    onOrderByChange,
}: {
    onSearch: (q: string) => void;
    orderBy: ServiceSortOrder;
    onOrderByChange: (orderBy: ServiceSortOrder) => void;
}) {
    const [value, setValue] = useState('');
    function submit(e: React.FormEvent) {
        e.preventDefault();
        onSearch(value);
    }

    function clearSearch() {
        setValue('');
        onSearch('');
    }

    return (
        <form
            onSubmit={submit}
            className="flex items-center justify-between gap-4"
        >
            <div className="relative h-[4.07vh] w-[27.86vw] min-w-[180px]">
                <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-[0.6vw] top-1/2 h-[2vh] w-[2vw] -translate-y-1/2 text-ink-placeholder"
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    maxLength={100}
                    placeholder="Search"
                    aria-label="Search services by keyword"
                    className="h-full w-full rounded-[50px] border border-line bg-surface-white pl-[3vw] pr-[3vw] type-sm text-ink placeholder:text-ink-placeholder focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                />
                {value && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        aria-label="Clear search"
                        className="absolute right-[1vw] top-1/2 -translate-y-1/2 rounded-full p-[0.16vw] type-sm text-ink-placeholder hover:bg-line hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    >
                        <X
                            aria-hidden="true"
                            className="h-[1.48vh] w-[0.73vw]"
                        />
                    </button>
                )}
            </div>
            <div className="flex items-center gap-2 type-sm text-ink-soft">
                <span>Order by:</span>
                <Dropdown
                    value={orderBy}
                    options={ORDER_OPTIONS}
                    onChange={onOrderByChange}
                    label="Order services by"
                    className="w-auto min-w-[180px] shrink-0"
                />
            </div>
        </form>
    );
}
