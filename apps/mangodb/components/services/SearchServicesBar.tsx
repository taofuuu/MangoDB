'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
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
    const [orderMenuOpen, setOrderMenuOpen] = useState(false);
    const orderMenuId = useId();
    const orderMenuRef = useRef<HTMLDivElement>(null);
    const selectedOrder = ORDER_OPTIONS.find(
        (option) => option.value === orderBy,
    )!;

    useEffect(() => {
        if (!orderMenuOpen) return;

        const closeOnOutsideClick = (event: MouseEvent) => {
            if (
                orderMenuRef.current &&
                !orderMenuRef.current.contains(event.target as Node)
            ) {
                setOrderMenuOpen(false);
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOrderMenuOpen(false);
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [orderMenuOpen]);

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
                <div
                    ref={orderMenuRef}
                    className="relative w-auto min-w-[180px] shrink-0"
                >
                    <button
                        type="button"
                        onClick={() => setOrderMenuOpen((open) => !open)}
                        aria-haspopup="listbox"
                        aria-expanded={orderMenuOpen}
                        aria-controls={orderMenuId}
                        className="rounded-button flex h-9 w-full items-center justify-between gap-2 border border-line bg-surface-white px-3 text-left type-xs text-ink shadow-card focus:ring-1 focus:ring-brand focus:outline-none"
                    >
                        <span>{selectedOrder.label}</span>
                        <ChevronDown
                            aria-hidden
                            className="h-4 w-4 shrink-0 text-ink-soft"
                        />
                    </button>

                    {orderMenuOpen && (
                        <div
                            id={orderMenuId}
                            role="listbox"
                            aria-label="Order services by"
                            className="rounded-button absolute left-0 top-10 z-50 w-full overflow-hidden border border-line bg-surface-white shadow-card"
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
                                    className={`flex h-9 w-full items-center px-3 text-left type-xs text-ink hover:bg-brand-tint focus:bg-brand-tint focus:outline-none ${
                                        option.value === orderBy
                                            ? 'bg-brand-tint text-brand-deep'
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
