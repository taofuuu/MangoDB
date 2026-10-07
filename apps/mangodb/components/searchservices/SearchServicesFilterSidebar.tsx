'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type {
    SearchServicesFilters,
    ServiceFilterOptions,
} from '@/lib/searchServices';

function FilterGroup({
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
                            ×
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
                        +
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
                            className="h-50 overflow-y-auto"
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

export function SearchServicesFilterSidebar({
    filters,
    options,
    optionsError,
    onChange,
    onClearAll,
}: {
    filters: SearchServicesFilters;
    options: ServiceFilterOptions;
    optionsError: string | null;
    onChange: (next: SearchServicesFilters) => void;
    onClearAll: () => void;
}) {
    return (
        <aside className="rounded-status w-full max-w-[300px] shrink-0 self-start bg-panel p-5">
            <div className="mb-1 flex items-center justify-between border-b border-brand-light pb-3">
                <h2 className="type-md text-ink">Filters</h2>
                <button
                    type="button"
                    onClick={onClearAll}
                    className="type-xs text-ink-soft underline hover:text-brand"
                >
                    Clear all
                </button>
            </div>

            {optionsError && (
                <p role="alert" className="mt-3 type-xs text-danger">
                    Filter choices could not be loaded: {optionsError}
                </p>
            )}

            <FilterGroup
                label="Service Category"
                options={options.categories}
                selected={filters.categories}
                onChange={(categories) => onChange({ ...filters, categories })}
            />
            <FilterGroup
                label="Tech Stack"
                options={options.techStack}
                selected={filters.techStack}
                onChange={(techStack) => onChange({ ...filters, techStack })}
                searchable
            />

            <div className="pt-3">
                <div className="mb-2 flex items-center justify-between">
                    <span className="type-sm text-ink">Price Range</span>
                    {(filters.minBudget != null ||
                        filters.maxBudget != null) && (
                        <button
                            type="button"
                            onClick={() =>
                                onChange({
                                    ...filters,
                                    minBudget: null,
                                    maxBudget: null,
                                })
                            }
                            className="type-xs text-ink-soft underline hover:text-brand"
                        >
                            Clear
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="shrink-0 type-sm text-ink">Min</span>
                        <input
                            type="number"
                            min={0}
                            value={filters.minBudget ?? ''}
                            onChange={(e) =>
                                onChange({
                                    ...filters,
                                    minBudget: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                })
                            }
                            className="rounded-input type-sm h-7 min-w-0 w-full border border-brand bg-surface-white px-2 text-ink focus:ring-1 focus:ring-brand focus:outline-none"
                        />
                    </label>
                    <span className="flex h-7 items-center justify-center type-sm text-ink">
                        -
                    </span>
                    <label className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="shrink-0 type-sm text-ink">Max</span>
                        <input
                            type="number"
                            min={0}
                            value={filters.maxBudget ?? ''}
                            onChange={(e) =>
                                onChange({
                                    ...filters,
                                    maxBudget: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                })
                            }
                            className="rounded-input type-sm h-7 min-w-0 w-full border border-brand bg-surface-white px-2 text-ink focus:ring-1 focus:ring-brand focus:outline-none"
                        />
                    </label>
                </div>
            </div>
        </aside>
    );
}
