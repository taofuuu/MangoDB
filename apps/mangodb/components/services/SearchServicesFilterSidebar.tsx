'use client';

import { useState } from 'react';
import type { ServiceFilterOptions } from '@mangodb/shared';
import type { SearchServicesFilters } from '@/lib/services';
import FilterGroup from '@/components/ui/FilterGroup';
import PriceRange from './PriceRange';

export default function SearchServicesFilterSidebar({
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
    const [priceResetVersion, setPriceResetVersion] = useState(0);

    const clearAll = () => {
        // Remount PriceRange so an uncommitted draft and its pending debounce
        // are discarded along with the committed filters.
        setPriceResetVersion((version) => version + 1);
        onClearAll();
    };

    return (
        <aside className="rounded-status w-full max-w-[300px] shrink-0 self-start bg-fill-subtle p-5">
            <div className="mb-1 flex items-center justify-between border-b border-brand-light pb-3">
                <h2 className="type-md text-ink">Filters</h2>
                <button
                    type="button"
                    onClick={clearAll}
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

            <PriceRange
                key={`${filters.minBudget ?? ''}-${filters.maxBudget ?? ''}-${priceResetVersion}`}
                filters={filters}
                onChange={onChange}
            />
        </aside>
    );
}
