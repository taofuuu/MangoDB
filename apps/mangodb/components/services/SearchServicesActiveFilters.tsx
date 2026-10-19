'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatBudgetRange } from '@/lib/money';
import type { SearchServicesFilters } from '@/lib/services';

function describe(filters: SearchServicesFilters): string[] {
    const parts: string[] = [];
    if (filters.categories.length > 0) {
        parts.push(`Category > ${filters.categories.join(', ')}`);
    }
    if (filters.techStack.length > 0) {
        parts.push(`Tech Stack : ${filters.techStack.join(', ')}`);
    }
    if (filters.minBudget != null || filters.maxBudget != null) {
        parts.push(
            `Budget : ${formatBudgetRange(filters.minBudget, filters.maxBudget)}`,
        );
    }
    return parts;
}

export default function SearchServicesActiveFilters({
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
            aria-expanded={open}
            aria-label="Toggle active service filters"
            className="flex w-full items-center gap-3 border-b border-line py-3 text-left type-lg text-ink"
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
