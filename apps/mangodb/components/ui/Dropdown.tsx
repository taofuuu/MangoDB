'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type DropdownOption<T extends string> = { label: string; value: T };

type DropdownProps<T extends string> = {
    // '' means nothing is chosen yet, and the placeholder shows.
    value: T | '';
    options: readonly DropdownOption<T>[];
    onChange: (value: T) => void;
    // Names the list for screen readers, e.g. "Order services by".
    label: string;
    placeholder?: string;
    // The width. The look is the same everywhere.
    className?: string;
};

// A pick-one list: the "Order by" and filter boxes. Arrow keys move, Enter
// picks, Escape and a click outside close it.
export default function Dropdown<T extends string>({
    value,
    options,
    onChange,
    label,
    placeholder = 'Select',
    className = 'w-full',
}: DropdownProps<T>) {
    const listId = useId();
    const [open, setOpen] = useState(false);
    const selectedIndex = options.findIndex((option) => option.value === value);
    const [highlightedIndex, setHighlightedIndex] = useState(
        Math.max(0, selectedIndex),
    );
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const selectedLabel = options[selectedIndex]?.label;

    useEffect(() => {
        if (!open) return;

        const closeOnOutsideClick = (event: MouseEvent) => {
            if (
                event.target instanceof Node &&
                !rootRef.current?.contains(event.target)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
        };
    }, [open]);

    useEffect(() => {
        if (open) optionRefs.current[highlightedIndex]?.focus();
    }, [open, highlightedIndex]);

    const openList = () => {
        setHighlightedIndex(Math.max(0, selectedIndex));
        setOpen(true);
    };

    const close = () => {
        setOpen(false);
        triggerRef.current?.focus();
    };

    const select = (next: T) => {
        onChange(next);
        close();
    };

    return (
        <div ref={rootRef} className={`relative min-w-0 ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-label={selectedLabel ? undefined : label}
                onClick={() => (open ? setOpen(false) : openList())}
                onKeyDown={(event) => {
                    if (
                        event.key === 'ArrowDown' ||
                        event.key === 'ArrowUp' ||
                        event.key === 'Enter' ||
                        event.key === ' '
                    ) {
                        event.preventDefault();
                        openList();
                    }
                }}
                className="flex h-10 w-full items-center justify-between gap-2 rounded-[10px] border border-line bg-surface-white px-3 text-left type-sm hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none sm:h-[4.07vh]"
            >
                <span
                    className={
                        selectedLabel
                            ? 'truncate text-ink'
                            : 'text-ink-placeholder'
                    }
                >
                    {selectedLabel ?? placeholder}
                </span>
                <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${
                        open ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {open && (
                <div
                    id={listId}
                    role="listbox"
                    aria-label={label}
                    className="absolute left-0 top-[calc(100%+0.4vh)] z-50 max-h-[40vh] w-full overflow-y-auto rounded-[10px] border border-line bg-surface-white shadow-card"
                >
                    {options.map((option, index) => (
                        <button
                            type="button"
                            role="option"
                            key={option.value}
                            ref={(element) => {
                                optionRefs.current[index] = element;
                            }}
                            tabIndex={highlightedIndex === index ? 0 : -1}
                            aria-selected={value === option.value}
                            onFocus={() => setHighlightedIndex(index)}
                            onKeyDown={(event) => {
                                if (event.key === 'ArrowDown') {
                                    event.preventDefault();
                                    setHighlightedIndex(
                                        (index + 1) % options.length,
                                    );
                                } else if (event.key === 'ArrowUp') {
                                    event.preventDefault();
                                    setHighlightedIndex(
                                        (index - 1 + options.length) %
                                            options.length,
                                    );
                                } else if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                ) {
                                    event.preventDefault();
                                    select(option.value);
                                } else if (event.key === 'Escape') {
                                    event.preventDefault();
                                    close();
                                }
                            }}
                            onClick={() => select(option.value)}
                            className={`flex min-h-[4.07vh] w-full items-center px-3 text-left type-sm hover:bg-fill-subtle focus-visible:bg-fill-subtle focus-visible:outline-none ${
                                value === option.value
                                    ? 'bg-brand-tint text-brand-deep'
                                    : 'text-ink'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
