'use client';

import { useEffect, useRef } from 'react';
import type { Pagination } from '@/lib/searchServices';

// Page-based control: "page 1/20" + Prev/Next, matching the mockup.
export function SearchServicesPaginationControls({
    pagination,
    onPageChange,
}: {
    pagination: Pagination;
    onPageChange: (page: number) => void;
}) {
    const { page, totalPages } = pagination;

    return (
        <div className="flex items-center justify-between pt-4">
            <span className="type-xs text-[var(--color-ink-soft)]">
                page {page}/{totalPages}
            </span>
            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="rounded-button cursor-pointer border border-[var(--color-line)] px-3 py-1.5 type-xs text-[var(--color-ink)] transition-colors hover:bg-[var(--color-brand-tint)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                    Prev
                </button>
                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    className="rounded-button cursor-pointer border border-[var(--color-line)] px-3 py-1.5 type-xs text-[var(--color-ink)] transition-colors hover:bg-[var(--color-brand-tint)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

// Infinite-scroll variant: an invisible sentinel near the bottom triggers
// loadMore via IntersectionObserver. Which one SearchServicesResultsGrid
// renders depends on `mode` — both read/write the same useSearchServices state.
export function SearchServicesInfiniteScrollSentinel({
    hasMore,
    loading,
    onLoadMore,
}: {
    hasMore: boolean;
    loading: boolean;
    onLoadMore: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && !loading) onLoadMore();
            },
            { rootMargin: '200px' },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, loading, onLoadMore]);

    if (!hasMore) return null;

    return (
        <div
            ref={ref}
            className="py-6 text-center type-xs text-[var(--color-ink-soft)]"
        >
            {loading ? 'Loading more…' : ''}
        </div>
    );
}
