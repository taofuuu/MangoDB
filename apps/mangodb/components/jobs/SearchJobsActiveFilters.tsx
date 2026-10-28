'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatDateOnly } from '@/lib/dates';
import { formatBudgetRange } from '@/lib/money';
import type { SearchJobsFilters } from '@/lib/jobs';

function describe(filters: SearchJobsFilters): string[] {
    const parts: string[] = [];
    if (filters.categories.length > 0) {
        parts.push(`Category > ${filters.categories.join(', ')}`);
    }
    if (filters.minBudget != null || filters.maxBudget != null) {
        parts.push(
            `Budget : ${formatBudgetRange(filters.minBudget, filters.maxBudget)}`,
        );
    }
    if (filters.deadlineType !== 'ANY' && filters.deadlineDate) {
        const direction =
            filters.deadlineType === 'BEFORE' ? 'Before' : 'After';
        parts.push(
            `Deadline : ${direction} ${formatDateOnly(filters.deadlineDate)}`,
        );
    }
    return parts;
}

export default function SearchJobsActiveFilters({
    filters,
}: {
    filters: SearchJobsFilters;
}) {
    const [open, setOpen] = useState(true);
    const parts = describe(filters);
    if (parts.length === 0) return null;

    return (
        <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Toggle active job filters"
            className="flex w-full items-center gap-3 border-b border-line py-3 text-left type-md text-ink"
        >
            <ChevronRight
                className={`transition-transform ${open ? 'rotate-90' : ''}`}
                aria-hidden
            />
            {open
                ? parts.join(' | ')
                : `${parts.length} filter${parts.length > 1 ? 's' : ''} applied`}
        </button>
    );
}
