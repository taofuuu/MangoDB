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
    const [highlightedIndex, setHighlightedIndex] = useState(
        Math.max(
            0,
            orderOptions.findIndex((option) => option.value === value),
        ),
    );
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
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
            if (event.key !== 'Escape' || !open) return;

            setOpen(false);
            triggerRef.current?.focus();
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [open]);

    useEffect(() => {
        if (open) optionRefs.current[highlightedIndex]?.focus();
    }, [open, highlightedIndex]);

    const selectOption = (nextValue: CompanySortOrder) => {
        onChange(nextValue);
        setOpen(false);
    };

    const openFromKeyboard = () => {
        setHighlightedIndex(
            Math.max(
                0,
                orderOptions.findIndex((option) => option.value === value),
            ),
        );
        setOpen(true);
    };

    return (
        <div
            ref={rootRef}
            className="relative w-full min-w-0 sm:w-[13vw] sm:min-w-[190px]"
        >
            <button
                ref={triggerRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls="company-order-options"
                onClick={() => (open ? setOpen(false) : openFromKeyboard())}
                onKeyDown={(event) => {
                    if (
                        event.key === 'ArrowDown' ||
                        event.key === 'ArrowUp' ||
                        event.key === 'Enter' ||
                        event.key === ' '
                    ) {
                        event.preventDefault();
                        openFromKeyboard();
                    }
                }}
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
                    id="company-order-options"
                    role="listbox"
                    aria-label="Company order"
                    className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-line bg-white shadow-lg"
                >
                    {orderOptions.map((option, index) => (
                        <button
                            type="button"
                            role="option"
                            id={`company-order-${option.value}`}
                            ref={(element) => {
                                optionRefs.current[index] = element;
                            }}
                            tabIndex={highlightedIndex === index ? 0 : -1}
                            aria-selected={value === option.value}
                            key={option.value}
                            onFocus={() => setHighlightedIndex(index)}
                            onKeyDown={(event) => {
                                if (event.key === 'ArrowDown') {
                                    event.preventDefault();
                                    setHighlightedIndex(
                                        (index + 1) % orderOptions.length,
                                    );
                                } else if (event.key === 'ArrowUp') {
                                    event.preventDefault();
                                    setHighlightedIndex(
                                        (index - 1 + orderOptions.length) %
                                            orderOptions.length,
                                    );
                                } else if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                ) {
                                    event.preventDefault();
                                    selectOption(option.value);
                                } else if (event.key === 'Escape') {
                                    event.preventDefault();
                                    setOpen(false);
                                    triggerRef.current?.focus();
                                }
                            }}
                            onClick={() => selectOption(option.value)}
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
