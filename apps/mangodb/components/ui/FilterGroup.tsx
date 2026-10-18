'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';

// A multi-pick filter: the chosen values as removable tags, and a + that
// opens the rest (searchable when the list is long). Knows no resource.
export default function FilterGroup({
    label,
    options,
    selected,
    onChange,
    searchable = false,
}: {
    label: string;
    options: string[];
    selected: string[];
    onChange: (next: string[]) => void;
    searchable?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const menuId = useId();
    const filterGroupRef = useRef<HTMLDivElement>(null);
    const available = options.filter((o) => !selected.includes(o));
    const visibleOptions = available.filter((option) =>
        option.toLowerCase().includes(query.trim().toLowerCase()),
    );

    const close = () => {
        setOpen(false);
        setQuery('');
    };

    useEffect(() => {
        if (!open) return;

        const closeOnOutsideClick = (event: MouseEvent) => {
            if (
                filterGroupRef.current &&
                !filterGroupRef.current.contains(event.target as Node)
            ) {
                close();
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [open]);

    return (
        <div className="py-3">
            <div className="mb-2 flex items-center justify-between">
                <span className="type-sm text-ink">{label}</span>
                {selected.length > 0 && (
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="type-xs text-ink-soft underline hover:text-brand"
                    >
                        Clear
                    </button>
                )}
            </div>

            <div
                ref={filterGroupRef}
                className="rounded-input relative flex min-h-[76px] flex-wrap content-start items-start gap-2 border border-brand-light bg-surface-white p-2"
            >
                {selected.map((tag) => (
                    <span
                        key={tag}
                        className="rounded-status flex items-center gap-1 bg-brand-tint px-2 py-1 type-xs text-brand-deep"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() =>
                                onChange(selected.filter((t) => t !== tag))
                            }
                            aria-label={`Remove ${tag}`}
                            className="text-brand-deep hover:text-danger"
                        >
                            <X aria-hidden className="h-3 w-3" />
                        </button>
                    </span>
                ))}

                {available.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setOpen((current) => !current)}
                        aria-label={`Add ${label} filter`}
                        aria-haspopup="listbox"
                        aria-expanded={open}
                        aria-controls={menuId}
                        className="rounded-status h-7 w-7 cursor-pointer bg-fill-muted text-center type-sm text-ink-soft hover:bg-line focus:ring-1 focus:ring-brand focus:outline-none"
                    >
                        <Plus aria-hidden className="mx-auto h-4 w-4" />
                    </button>
                )}

                {open && available.length > 0 && (
                    <div
                        id={menuId}
                        className="rounded-input absolute left-0 top-full z-50 mt-1 w-full border border-line bg-surface-white shadow-card"
                    >
                        {searchable && (
                            <div className="border-b border-line p-2">
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(event) =>
                                        setQuery(event.target.value)
                                    }
                                    placeholder={`Search ${label.toLowerCase()}`}
                                    aria-label={`Search ${label} options`}
                                    className="rounded-input w-full border border-brand bg-surface-white px-2 py-1.5 type-xs text-ink placeholder:text-ink-placeholder focus:ring-1 focus:ring-brand focus:outline-none"
                                    autoFocus
                                />
                            </div>
                        )}

                        <div
                            role="listbox"
                            aria-label={`${label} options`}
                            className="max-h-52 overflow-y-auto"
                        >
                            {visibleOptions.map((option) => (
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={false}
                                    key={option}
                                    onClick={() => {
                                        onChange([...selected, option]);
                                        close();
                                    }}
                                    className="block w-full px-3 py-2 text-left type-sm text-ink hover:bg-brand-tint focus:bg-brand-tint focus:outline-none"
                                >
                                    {option}
                                </button>
                            ))}

                            {visibleOptions.length === 0 && (
                                <p className="px-3 py-4 text-center type-xs text-ink-soft">
                                    No matching options
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
