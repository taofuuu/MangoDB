'use client';

import { useState } from 'react';
import type { SearchServicesFilters } from '@/lib/searchServices';

function describe(filters: SearchServicesFilters): string[] {
    const parts: string[] = [];
    if (filters.categories.length > 0) {
        parts.push(`Service Category: ${filters.categories.join(', ')}`);
    }
    if (filters.techStack.length > 0) {
        parts.push(`Tech Stack: ${filters.techStack.join(', ')}`);
    }
    if (filters.minBudget != null || filters.maxBudget != null) {
        parts.push(
            `Price Range: ${filters.minBudget ?? 0}-${filters.maxBudget ?? '∞'}`,
        );
    }
    return parts;
}

export function SearchServicesActiveFilters({
    filters,
}: {
    filters: SearchServicesFilters;
}) {
    const [open, setOpen] = useState(true);
    const parts = describe(filters);
    if (parts.length === 0) return null;

    return (
        <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center gap-2 border-b border-[var(--color-line)] py-3 text-left type-xs text-[var(--color-ink-soft)]"
        >
            <span
                className={`transition-transform ${open ? 'rotate-90' : ''}`}
                aria-hidden
            >
                ›
            </span>
            {open
                ? parts.join(' | ')
                : `${parts.length} filter${parts.length > 1 ? 's' : ''} applied`}
        </button>
    );
}
