'use client';

import { useEffect } from 'react';
import type { PaginationMeta } from '@mangodb/shared';

import Button from '@/components/ui/Button';

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

    useEffect(() => {
        if (isPageOutOfRange) {
            onPageChange(totalPages);
        }
    }, [isPageOutOfRange, onPageChange, totalPages]);

    if (!pagination || pagination.totalItems === 0 || isPageOutOfRange) {
        return null;
    }

    const { page, pageSize, totalItems } = pagination;
    const firstItem = (page - 1) * pageSize + 1;
    const lastItem = Math.min(page * pageSize, totalItems);

    return (
        <nav
            aria-label={ariaLabel}
            className={`mt-[2.22vh] flex shrink-0 items-center justify-between gap-[1.04vw] ${className}`}
        >
            <p className="type-sm text-ink-soft">
                Showing {firstItem}–{lastItem} of {totalItems}
            </p>

            <div className="flex items-center gap-[0.63vw]">
                <Button
                    variant="outline"
                    disabled={page <= 1 || isLoading}
                    onClick={() => onPageChange(page - 1)}
                    className="h-[4.63vh] border-pagination-border px-[1.04vw] type-sm"
                >
                    Previous
                </Button>

                <span className="min-w-[5.21vw] text-center type-sm text-ink-soft">
                    Page {page} of {totalPages}
                </span>

                <Button
                    variant="outline"
                    disabled={page >= totalPages || isLoading}
                    onClick={() => onPageChange(page + 1)}
                    className="h-[4.63vh] border-pagination-border px-[1.04vw] type-sm"
                >
                    Next
                </Button>
            </div>
        </nav>
    );
}
