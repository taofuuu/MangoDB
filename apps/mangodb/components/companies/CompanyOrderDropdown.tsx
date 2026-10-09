'use client';

import { useEffect, useRef, useState } from 'react';
import type { CompanySortOrder } from '@mangodb/shared';
import { ChevronDown } from 'lucide-react';

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
                className="flex h-10 w-full items-center justify-between rounded-[10px] border border-line bg-surface-white px-[0.7vw] text-left type-sm hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none sm:h-[4.07vh]"
            >
                <span className="text-ink">{selectedLabel}</span>
                <ChevronDown
                    aria-hidden="true"
                    className={`h-[1.5vh] w-[1vw] shrink-0 transition-transform ${
                        open ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {open && (
                <div
                    id="company-order-options"
                    role="listbox"
                    aria-label="Company order"
                    className="absolute left-0 top-[calc(100%+0.4vh)] z-50 w-full overflow-hidden rounded-[10px] border border-line bg-surface-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
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
                            className="flex min-h-[4.07vh] w-full items-center px-[0.7vw] text-left type-sm text-ink hover:bg-fill-subtle focus-visible:bg-fill-subtle focus-visible:outline-none"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
