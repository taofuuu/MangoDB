'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
                className="rounded-button type-sm w-full max-w-md border border-line bg-surface-white px-5 py-2 text-ink shadow-card placeholder:text-ink-placeholder focus:ring-1 focus:ring-brand focus:outline-none"
            />
            <div className="flex items-center gap-2 type-sm text-ink-soft">
                <span>Order by:</span>
                <div
                    ref={orderMenuRef}
                    className="relative w-[8.125vw] min-w-[8.125vw] max-w-[8.125vw] shrink-0 basis-[8.125vw]"
                >
                    <button
                        type="button"
                        onClick={() => setOrderMenuOpen((open) => !open)}
                        aria-haspopup="listbox"
                        aria-expanded={orderMenuOpen}
                        aria-controls={orderMenuId}
                        className="rounded-button flex h-[4.07vh] min-h-[4.07vh] max-h-[4.07vh] w-full box-border items-center justify-between gap-2 border border-line bg-surface-white px-[0.7vw] text-left type-xs text-ink shadow-card focus:ring-1 focus:ring-brand focus:outline-none"
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
                            className="rounded-button absolute left-0 top-[calc(100%+0.4vh)] z-50 h-[12vh] w-full overflow-hidden border border-line bg-surface-white shadow-card"
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
                                    className={`flex h-1/3 w-full items-center px-[0.7vw] text-left type-xs text-ink hover:bg-brand-tint focus:bg-brand-tint focus:outline-none ${
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
