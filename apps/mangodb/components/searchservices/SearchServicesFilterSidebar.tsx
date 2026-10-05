'use client';

import type { SearchServicesFilters } from '@/lib/searchServices';

function FilterGroup({
    label,
    options,
    selected,
    onChange,
}: {
    label: string;
    options: string[];
    selected: string[];
    onChange: (next: string[]) => void;
}) {
    const available = options.filter((o) => !selected.includes(o));

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

            <div className="rounded-input flex min-h-[76px] flex-wrap content-start items-start gap-2 border border-[var(--color-brand-light)] bg-[var(--color-surface-white)] p-2">
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
                    <select
                        value=""
                        onChange={(e) => {
                            if (e.target.value)
                                onChange([...selected, e.target.value]);
                        }}
                        aria-label={`Add ${label} filter`}
                        className="h-7 w-7 cursor-pointer appearance-none rounded-full bg-[var(--color-fill-muted)] text-center type-sm text-[var(--color-ink-soft)] [text-align-last:center]"
                    >
                        <option value="" disabled>
                            +
                        </option>
                        {available.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                )}
            </div>
        </div>
    );
}

export function SearchServicesFilterSidebar({
    filters,
    options,
    onChange,
    onClearAll,
}: {
    filters: SearchServicesFilters;
    options: {
        categories: string[];
        companyTypes: string[];
        techStack: string[];
    };
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

            <FilterGroup
                label="Category"
                options={options.categories}
                selected={filters.categories}
                onChange={(categories) => onChange({ ...filters, categories })}
            />
            <FilterGroup
                label="Company Type"
                options={options.companyTypes}
                selected={filters.companyTypes}
                onChange={(companyTypes) =>
                    onChange({ ...filters, companyTypes })
                }
            />
            <FilterGroup
                label="Tech Stack"
                options={options.techStack}
                selected={filters.techStack}
                onChange={(techStack) => onChange({ ...filters, techStack })}
            />

            <div className="pt-3">
                <div className="mb-2 flex items-center justify-between">
                    <span className="type-sm text-[var(--color-ink)]">
                        Budget
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
