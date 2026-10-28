'use client';

import { useEffect, useRef, useState } from 'react';
import type {
    DeadlineType,
    JobFilterOptions,
    SearchJobsFilters,
} from '@/lib/jobs';
import FilterGroup from '@/components/ui/FilterGroup';
import Dropdown from '@/components/ui/Dropdown';

const DEADLINE_OPTIONS: { label: string; value: DeadlineType }[] = [
    { label: 'Any', value: 'ANY' },
    { label: 'Before', value: 'BEFORE' },
    { label: 'After', value: 'AFTER' },
];

function parseBudget(value: string): number | null {
    if (value.trim() === '') return null;
    const num = Number(value);
    return Number.isInteger(num) && num >= 0 ? num : null;
}

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
    const [minInput, setMinInput] = useState(
        filters.minBudget?.toString() ?? '',
    );
    const [maxInput, setMaxInput] = useState(
        filters.maxBudget?.toString() ?? '',
    );
    const [prevFilters, setPrevFilters] = useState(filters);
    if (filters !== prevFilters) {
        setPrevFilters(filters);
        setMinInput(filters.minBudget?.toString() ?? '');
        setMaxInput(filters.maxBudget?.toString() ?? '');
    }

    const latestFilters = useRef(filters);

    useEffect(() => {
        latestFilters.current = filters;
    }, [filters]);

    useEffect(() => {
        const minBudget = parseBudget(minInput);
        const maxBudget = parseBudget(maxInput);
        const current = latestFilters.current;

        if (
            minBudget === current.minBudget &&
            maxBudget === current.maxBudget
        ) {
            return;
        }

        const timeout = window.setTimeout(() => {
            onChange({
                ...latestFilters.current,
                minBudget,
                maxBudget,
            });
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [minInput, maxInput, onChange]);

    const clearBudget = () => {
        setMinInput('');
        setMaxInput('');
        onChange({
            ...latestFilters.current,
            minBudget: null,
            maxBudget: null,
        });
    };

    const clearDeadline = () => {
        onChange({
            ...latestFilters.current,
            deadlineType: 'ANY',
            deadlineDate: '',
        });
    };

    const hasBudgetFilter =
        filters.minBudget != null || filters.maxBudget != null;
    const hasDeadlineFilter = filters.deadlineDate !== '';

    return (
        <aside
            className={`relative h-[57.41vh] w-[23.17vw] rounded-popup self-start bg-fill-subtle p-5 ${className ?? ''}`}
        >
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
            <div className="border-t border-brand-light py-3">
                <div className="mb-2 flex items-center justify-between">
                    <span className="type-sm text-ink">Budget</span>
                    {hasBudgetFilter && (
                        <button
                            type="button"
                            onClick={clearBudget}
                            className="type-xs text-ink-soft underline hover:text-brand"
                        >
                            Clear
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex min-w-0 flex-1 items-center gap-1 type-sm text-ink">
                        <span>Min</span>
                        <input
                            type="number"
                            min={0}
                            value={minInput}
                            onChange={(e) => setMinInput(e.target.value)}
                            aria-label="Minimum budget"
                            className="rounded-input type-sm h-7 min-w-0 w-full border border-brand bg-surface-white px-2 text-center text-ink focus:ring-1 focus:ring-brand focus:outline-none"
                        />
                    </label>
                    <span className="type-sm text-ink">-</span>
                    <label className="flex min-w-0 flex-1 items-center gap-1 type-sm text-ink">
                        <span>Max</span>
                        <input
                            type="number"
                            min={0}
                            value={maxInput}
                            onChange={(e) => setMaxInput(e.target.value)}
                            aria-label="Maximum budget"
                            className="rounded-input type-sm h-7 min-w-0 w-full border border-brand bg-surface-white px-2 text-center text-ink focus:ring-1 focus:ring-brand focus:outline-none"
                        />
                    </label>
                </div>
            </div>

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
