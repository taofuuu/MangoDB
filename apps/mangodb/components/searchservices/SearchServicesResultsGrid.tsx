'use client';

import { useEffect, useRef } from 'react';
import type { PaginationMeta } from '@mangodb/shared';
import type { ServiceSummary } from '@/lib/searchServices';
import type { SearchServicesMode } from '@/lib/useSearchServices';
import Link from 'next/link';
import { describeError, isNotSignedIn } from '@/lib/api';
import Pagination from '@/components/ui/Pagination';
import { SearchServiceCard } from './SearchServiceCard';
import { SearchServicesEmptyState } from './SearchServicesEmptyState';

function CardSkeleton() {
    return (
        <div className="rounded-button h-[160px] animate-pulse border border-[var(--color-line)] bg-[var(--color-brand-tint)]" />
    );
}

function InfiniteScrollSentinel({
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
        const element = ref.current;
        if (!element || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && !loading) onLoadMore();
            },
            { rootMargin: '200px' },
        );
        observer.observe(element);
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

export function SearchServicesResultsGrid({
    mode,
    items,
    status,
    error,
    pagination,
    hasMore,
    onPageChange,
    onLoadMore,
}: {
    mode: SearchServicesMode;
    items: ServiceSummary[];
    status: 'idle' | 'loading' | 'loaded' | 'error';
    error: unknown;
    pagination: PaginationMeta | null;
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
        if (isNotSignedIn(error)) {
            return (
                <p className="py-24 text-center type-sm text-[var(--color-ink-soft)]">
                    Please sign in to browse services.{' '}
                    <Link
                        href="/login"
                        className="text-[var(--color-brand)] underline"
                    >
                        Sign in
                    </Link>
                </p>
            );
        }

        return (
            <p className="py-24 text-center type-sm text-[var(--color-danger)]">
                {describeError(error)}
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
                className="flex max-h-[calc(100vh-280px)] min-h-[320px] flex-col gap-4 overflow-y-auto px-2 py-2"
            >
                {items.map((service) => (
                    <SearchServiceCard
                        key={service.listingId}
                        service={service}
                    />
                ))}

                {mode === 'infinite' && (
                    <InfiniteScrollSentinel
                        hasMore={hasMore}
                        loading={status === 'loading'}
                        onLoadMore={onLoadMore}
                    />
                )}
            </div>

            {mode === 'pagination' && (
                <Pagination
                    pagination={pagination}
                    onPageChange={onPageChange}
                    ariaLabel="Service pages"
                    isLoading={status === 'loading'}
                />
            )}
        </div>
    );
}
