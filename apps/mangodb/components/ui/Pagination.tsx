'use client';

import { useEffect } from 'react';
import type { PaginationMeta } from '@mangodb/shared';

type PaginationProps = {
    pagination: PaginationMeta | null | undefined;
    onPageChange: (page: number) => void;
    ariaLabel: string;
    isLoading?: boolean;
    className?: string;
};

export default function Pagination({
    pagination,
    onPageChange,
    ariaLabel,
    isLoading = false,
    className = '',
}: PaginationProps) {
    const currentPage = pagination?.page ?? 0;
    const totalPages = pagination?.totalPages ?? 0;
    const isPageOutOfRange =
        pagination !== null &&
        pagination !== undefined &&
        pagination.totalItems > 0 &&
        totalPages > 0 &&
        currentPage > totalPages;

    // The list can shrink between fetches; step back to the last page.
    useEffect(() => {
        if (isPageOutOfRange) {
            onPageChange(totalPages);
        }
    }, [isPageOutOfRange, onPageChange, totalPages]);

    if (
        !pagination ||
        pagination.totalItems === 0 ||
        totalPages <= 1 ||
        isPageOutOfRange
    ) {
        return null;
    }

    const { page } = pagination;

    return (
        <nav
            aria-label={ariaLabel}
            className={`mt-4 flex shrink-0 items-center justify-between border-t border-line pt-3 ${className}`}
        >
            <span className="type-xs text-ink-soft">
                Page {page} of {totalPages}
            </span>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={isLoading || page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="px-3 py-1 type-xs rounded-md border border-brand text-brand hover:bg-brand/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    ← Prev
                </button>

                <button
                    type="button"
                    disabled={isLoading || page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    className="px-3 py-1 type-xs rounded-md border border-brand text-brand hover:bg-brand/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Next →
                </button>
            </div>
        </nav>
    );
}
