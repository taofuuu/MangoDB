'use client';

import { useEffect, useRef, useState } from 'react';
import type {
    DeadlineType,
    JobFilterOptions,
    SearchJobsFilters,
} from '@/lib/jobs';
import FilterGroup from '@/components/ui/FilterGroup';
import Dropdown from '@/components/ui/Dropdown';
import PriceRange from './PriceRange';

const DEADLINE_OPTIONS: { label: string; value: DeadlineType }[] = [
    { label: 'Any', value: 'ANY' },
    { label: 'Before', value: 'BEFORE' },
    { label: 'After', value: 'AFTER' },
];

export default function JobFilterSidebar({
    filters,
    options,
    optionsError,
    onChange,
    onClearAll,
    className,
}: {
    filters: SearchJobsFilters;
    options: JobFilterOptions;
    optionsError: string | null;
    onChange: (next: SearchJobsFilters) => void;
    onClearAll: () => void;
    className?: string;
}) {
    const [priceResetVersion, setPriceResetVersion] = useState(0);
    const latestFilters = useRef(filters);

    useEffect(() => {
        latestFilters.current = filters;
    }, [filters]);

    const clearAll = () => {
        setPriceResetVersion((version) => version + 1);
        onClearAll();
    };

    const clearDeadline = () => {
        onChange({
            ...latestFilters.current,
            deadlineType: 'ANY',
            deadlineDate: '',
        });
    };

    const hasDeadlineFilter =
        filters.deadlineType !== 'ANY' || filters.deadlineDate !== '';

    return (
        <aside
            className={`relative h-[57.41vh] w-[23.17vw] rounded-popup self-start bg-fill-subtle p-5 ${className ?? ''}`}
        >
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

            {/* Category Filter */}
            <FilterGroup
                label="Category"
                options={options.categories}
                selected={filters.categories}
                onChange={(categories) =>
                    onChange({ ...latestFilters.current, categories })
                }
            />

            {/* Budget Range Filter */}
            <PriceRange
                key={`${filters.minBudget ?? ''}-${filters.maxBudget ?? ''}-${priceResetVersion}`}
                filters={filters}
                onChange={onChange}
            />

            {/* Deadline Filter */}
            <div className="border-t border-brand-light py-3">
                <div className="mb-2 flex items-center justify-between">
                    <span className="type-sm text-ink">Deadline</span>
                    {hasDeadlineFilter && (
                        <button
                            type="button"
                            onClick={clearDeadline}
                            className="type-xs text-ink-soft underline hover:text-brand"
                        >
                            Clear
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Dropdown
                        value={filters.deadlineType}
                        options={DEADLINE_OPTIONS}
                        onChange={(next) =>
                            onChange({
                                ...latestFilters.current,
                                deadlineType: next,
                            })
                        }
                        label="Deadline before or after"
                        className="w-[90px] shrink-0"
                    />
                    <input
                        type="date"
                        value={filters.deadlineDate}
                        onChange={(e) => {
                            const nextDate = e.target.value;
                            const currentType =
                                latestFilters.current.deadlineType;
                            onChange({
                                ...latestFilters.current,
                                deadlineDate: nextDate,
                                deadlineType:
                                    nextDate && currentType === 'ANY'
                                        ? 'BEFORE'
                                        : currentType,
                            });
                        }}
                        aria-label="Deadline date"
                        className="rounded-input type-sm h-7 min-w-0 flex-1 border border-brand bg-surface-white px-2 text-ink focus:ring-1 focus:ring-brand focus:outline-none"
                    />
                </div>
            </div>
        </aside>
    );
}
