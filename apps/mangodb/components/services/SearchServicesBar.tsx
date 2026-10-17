'use client';

import Dropdown from '@/components/ui/Dropdown';
import SearchBar from '@/components/ui/SearchBar';
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
    return (
        <div className="flex items-center justify-between gap-4">
            <SearchBar
                onSearch={onSearch}
                label="Search services by keyword"
                className="w-[27.86vw]"
            />
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
        </div>
    );
}
