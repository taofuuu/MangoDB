'use client';

import { useId, useState } from 'react';
import type { SearchServicesOrder } from '@/lib/searchServices';

const ORDER_OPTIONS: { value: SearchServicesOrder; label: string }[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'price-asc', label: 'Budget: low to high' },
    { value: 'price-desc', label: 'Budget: high to low' },
];

export function SearchServicesBar({
    onSearch,
    orderBy,
    onOrderByChange,
}: {
    onSearch: (q: string) => void;
    orderBy: SearchServicesOrder;
    onOrderByChange: (orderBy: SearchServicesOrder) => void;
}) {
    const [value, setValue] = useState('');
    const [orderMenuOpen, setOrderMenuOpen] = useState(false);
    const orderMenuId = useId();
    const selectedOrder = ORDER_OPTIONS.find(
        (option) => option.value === orderBy,
    )!;

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
            <div className="flex items-center gap-2 type-xs text-[var(--color-ink-soft)]">
                <span>Order by:</span>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setOrderMenuOpen((open) => !open)}
                        aria-haspopup="listbox"
                        aria-expanded={orderMenuOpen}
                        aria-controls={orderMenuId}
                        className="rounded-input flex min-w-[180px] items-center justify-between gap-3 border border-brand-dark bg-surface-white/80 px-3 py-1.5 text-left type-xs text-ink shadow-card"
                    >
                        <span>{selectedOrder.label}</span>
                        <span aria-hidden className="type-xs text-ink-soft">
                            ▼
                        </span>
                    </button>

                    {orderMenuOpen && (
                        <div
                            id={orderMenuId}
                            role="listbox"
                            aria-label="Order services by"
                            className="absolute right-0 top-full z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg"
                        >
                            {ORDER_OPTIONS.map((option) => (
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={option.value === orderBy}
                                    key={option.value}
                                    onClick={() => {
                                        onOrderByChange(option.value);
                                        setOrderMenuOpen(false);
                                    }}
                                    className={`block w-full px-3 py-2 text-left type-sm text-gray-800 hover:bg-gray-100 ${
                                        option.value === orderBy
                                            ? 'bg-gray-100'
                                            : ''
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </form>
    );
}
