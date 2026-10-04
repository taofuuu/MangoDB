'use client';

import { useEffect, useRef } from 'react';
import type { Pagination, ServiceSummary } from '@/lib/searchServices';
import type { SearchServicesMode } from '@/lib/useSearchServices';
import { SearchServiceCard } from './SearchServiceCard';
import { SearchServicesEmptyState } from './SearchServicesEmptyState';
import {
    SearchServicesInfiniteScrollSentinel,
    SearchServicesPaginationControls,
} from './SearchServicesPagination';

function CardSkeleton() {
    return (
        <div className="rounded-button h-[160px] animate-pulse border border-[var(--color-line)] bg-[var(--color-brand-tint)]" />
    );
}

export function SearchServicesResultsGrid({
    mode,
    items,
    status,
    pagination,
    hasMore,
    onPageChange,
    onLoadMore,
}: {
    mode: SearchServicesMode;
    items: ServiceSummary[];
    status: 'idle' | 'loading' | 'loaded' | 'error';
    pagination: Pagination | null;
    hasMore: boolean;
    onPageChange: (page: number) => void;
    onLoadMore: () => void;
}) {
    const listRef = useRef<HTMLDivElement>(null);
    const currentPage = pagination?.page;

    // When the page changes, jump the list back to the top so the new page
    // doesn't open already scrolled to the bottom.
    useEffect(() => {
        if (mode === 'pagination') listRef.current?.scrollTo({ top: 0 });
    }, [currentPage, mode]);

    if (status === 'loading' && items.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <CardSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (status === 'error') {
        return (
            <p className="py-24 text-center type-sm text-[var(--color-danger)]">
                Something went wrong loading services. Try again.
            </p>
        );
    }

    if (status === 'loaded' && items.length === 0) {
        return <SearchServicesEmptyState />;
    }

    return (
        <div>
            {/* Scroll area: one page (10 items) scrolls inside this box.
                px-2/py-2 leave room so the card shadows aren't clipped by
                overflow. Change max-h to make the box taller/shorter. */}
            <div
                ref={listRef}
                className="modal-scrollbar flex max-h-[calc(100vh-340px)] min-h-[320px] flex-col gap-4 overflow-y-auto px-2 py-2"
            >
                {items.map((service) => (
                    <SearchServiceCard
                        key={service.listingId}
                        service={service}
                    />
                ))}

                {mode === 'infinite' && (
                    <SearchServicesInfiniteScrollSentinel
                        hasMore={hasMore}
                        loading={status === 'loading'}
                        onLoadMore={onLoadMore}
                    />
                )}
            </div>

            {mode === 'pagination' &&
                pagination &&
                pagination.totalPages > 1 && (
                    <SearchServicesPaginationControls
                        pagination={pagination}
                        onPageChange={onPageChange}
                    />
                )}
        </div>
    );
}
