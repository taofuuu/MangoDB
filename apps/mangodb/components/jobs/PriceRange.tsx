'use client';

import { useEffect, useRef, useState } from 'react';
import type { SearchJobsFilters } from '@/lib/jobs';

function parseBudget(value: string): number | null {
    if (value.trim() === '') return null;
    const num = Number(value);
    return Number.isInteger(num) && num >= 0 ? num : null;
}

export default function PriceRange({
    filters,
    onChange,
}: {
    filters: SearchJobsFilters;
    onChange: (next: SearchJobsFilters) => void;
}) {
    const [minInput, setMinInput] = useState(
        filters.minBudget?.toString() ?? '',
    );
    const [maxInput, setMaxInput] = useState(
        filters.maxBudget?.toString() ?? '',
    );
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

    const clear = () => {
        setMinInput('');
        setMaxInput('');
        onChange({
            ...latestFilters.current,
            minBudget: null,
            maxBudget: null,
        });
    };

    const hasBudgetFilter =
        filters.minBudget != null || filters.maxBudget != null;

    return (
        <div className="border-t border-brand-light py-3">
            <div className="mb-2 flex items-center justify-between">
                <span className="type-sm text-ink">Budget</span>
                {hasBudgetFilter && (
                    <button
                        type="button"
                        onClick={clear}
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
    );
}
