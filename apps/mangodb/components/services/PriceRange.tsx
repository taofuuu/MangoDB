'use client';

import { useEffect, useRef, useState } from 'react';
import type { SearchServicesFilters } from '@/lib/services';

function parseBudget(value: string): number | null {
    if (value.trim() === '') return null;

    const budget = Number(value);
    return Number.isInteger(budget) && budget >= 0 ? budget : null;
}

// The Min and Max price boxes of the service filters. Commits after a short
// pause, not on every digit.
export default function PriceRange({
    filters,
    onChange,
}: {
    filters: SearchServicesFilters;
    onChange: (next: SearchServicesFilters) => void;
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

    // Waiting briefly before committing avoids issuing a request for every
    // digit while still making number filters feel immediate.
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

    return (
        <div className="pt-3">
            <div className="mb-2 flex items-center justify-between">
                <span className="type-sm text-ink">Price Range</span>
                {(filters.minBudget != null || filters.maxBudget != null) && (
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
                <label className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="shrink-0 type-sm text-ink">Min</span>
                    <input
                        type="number"
                        min={0}
                        value={minInput}
                        onChange={(event) => setMinInput(event.target.value)}
                        aria-label="Minimum price"
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
                        value={maxInput}
                        onChange={(event) => setMaxInput(event.target.value)}
                        aria-label="Maximum price"
                        className="rounded-input type-sm h-7 min-w-0 w-full border border-brand bg-surface-white px-2 text-ink focus:ring-1 focus:ring-brand focus:outline-none"
                    />
                </label>
            </div>
        </div>
    );
}
