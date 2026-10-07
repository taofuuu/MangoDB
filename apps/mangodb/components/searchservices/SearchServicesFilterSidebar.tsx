'use client';

import { useId, useState } from 'react';
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
    const available = options.filter((o) => !selected.includes(o));
    const visibleOptions = available.filter((option) =>
        option.toLowerCase().includes(query.trim().toLowerCase()),
    );

    const close = () => {
        setOpen(false);
        setQuery('');
    };

    return (
        <div className="py-3">
            <div className="mb-2 flex items-center justify-between">
                <span className="type-sm text-[var(--color-ink)]">{label}</span>
                {selected.length > 0 && (
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="type-xs text-[var(--color-ink-soft)] underline hover:text-[var(--color-brand)]"
                    >
                        Clear
                    </button>
                )}
            </div>

            <div className="rounded-input relative flex min-h-[76px] flex-wrap content-start items-start gap-2 border border-[var(--color-brand-light)] bg-[var(--color-surface-white)] p-2">
                {selected.map((tag) => (
                    <span
                        key={tag}
                        className="rounded-status flex items-center gap-1 bg-[var(--color-brand-tint)] px-2 py-1 type-xs text-[var(--color-brand-deep)]"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() =>
                                onChange(selected.filter((t) => t !== tag))
                            }
                            aria-label={`Remove ${tag}`}
                            className="text-[var(--color-brand-deep)] hover:text-[var(--color-danger)]"
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
                        aria-expanded={open}
                        aria-controls={menuId}
                        className="h-7 w-7 cursor-pointer appearance-none rounded-full bg-[var(--color-fill-muted)] text-center type-sm text-[var(--color-ink-soft)] [text-align-last:center]"
                    >
                        +
                    </button>
                )}

                {open && available.length > 0 && (
                    <div
                        id={menuId}
                        className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg"
                    >
                        {searchable && (
                            <div className="border-b border-gray-200 p-2">
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(event) =>
                                        setQuery(event.target.value)
                                    }
                                    placeholder={`Search ${label.toLowerCase()}`}
                                    aria-label={`Search ${label} options`}
                                    className="rounded-input w-full border border-brand-dark bg-surface-white/80 px-2 py-1.5 type-xs text-ink outline-none placeholder:text-line focus:ring-1 focus:ring-brand"
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
                                    aria-selected="false"
                                    key={option}
                                    onClick={() => {
                                        onChange([...selected, option]);
                                        close();
                                    }}
                                    className="block w-full px-3 py-2 text-left type-sm text-gray-800 hover:bg-gray-100"
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
        <aside className="w-full max-w-[300px] shrink-0 self-start rounded-2xl bg-[var(--color-panel)] p-5">
            <div className="mb-1 flex items-center justify-between border-b border-[var(--color-brand-light)] pb-3">
                <h2 className="type-md text-[var(--color-ink)]">Filters</h2>
                <button
                    type="button"
                    onClick={onClearAll}
                    className="type-xs text-[var(--color-ink-soft)] underline hover:text-[var(--color-brand)]"
                >
                    Clear all
                </button>
            </div>

            {optionsError && (
                <p
                    role="alert"
                    className="mt-3 type-xs text-[var(--color-danger)]"
                >
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
                    <span className="type-sm text-[var(--color-ink)]">
                        Price Range
                    </span>
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
                            className="type-xs text-[var(--color-ink-soft)] underline hover:text-[var(--color-brand)]"
                        >
                            Clear
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex-1">
                        <span className="type-xs text-[var(--color-ink-soft)]">
                            Min
                        </span>
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
                            className="rounded-input type-xs mt-1 w-full border border-[var(--color-brand-light)] bg-[var(--color-surface-white)] px-2 py-1"
                        />
                    </label>
                    <span className="mt-4 text-[var(--color-ink-soft)]">-</span>
                    <label className="flex-1">
                        <span className="type-xs text-[var(--color-ink-soft)]">
                            Max
                        </span>
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
                            className="rounded-input type-xs mt-1 w-full border border-[var(--color-brand-light)] bg-[var(--color-surface-white)] px-2 py-1"
                        />
                    </label>
                </div>
            </div>
        </aside>
    );
}
