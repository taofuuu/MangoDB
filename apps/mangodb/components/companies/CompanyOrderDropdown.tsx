'use client';

import { useEffect, useRef, useState } from 'react';
import type { CompanySortOrder } from '@mangodb/shared';

const orderOptions: { label: string; value: CompanySortOrder }[] = [
    { label: 'Company name A–Z', value: 'nameAsc' },
    { label: 'Company name Z–A', value: 'nameDesc' },
];

type CompanyOrderDropdownProps = {
    value: CompanySortOrder;
    onChange: (value: CompanySortOrder) => void;
};

export default function CompanyOrderDropdown({
    value,
    onChange,
}: CompanyOrderDropdownProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const selectedLabel =
        orderOptions.find((option) => option.value === value)?.label ??
        'Company name A–Z';

    useEffect(() => {
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (
                event.target instanceof Node &&
                !rootRef.current?.contains(event.target)
            ) {
                setOpen(false);
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, []);

    return (
        <div ref={rootRef} className="relative w-[13vw] min-w-[190px]">
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
                className="flex h-10 w-full items-center justify-between rounded-input border border-line bg-surface-white/80 px-1.5 text-left focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none sm:h-[4.89vh]"
            >
                <span className="type-sm text-ink">{selectedLabel}</span>
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 type-md text-ink-soft"
                >
                    ▼
                </span>
            </button>

            {open && (
                <div
                    role="listbox"
                    aria-label="Company order"
                    className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-line bg-white shadow-lg"
                >
                    {orderOptions.map((option) => (
                        <button
                            type="button"
                            role="option"
                            aria-selected={value === option.value}
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                            className="block w-full px-3 py-2 text-left type-sm text-ink hover:bg-fill-subtle focus-visible:bg-fill-subtle focus-visible:outline-none"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
