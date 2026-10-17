import type { PaginationMeta } from '@mangodb/shared';

// The page a list query asked for, as its schema parsed it.
export type PageQuery = { page: number; pageSize: number };

// Which rows one page covers. Spread into findMany: { ...pageArgs(query) }.
export function pageArgs({ page, pageSize }: PageQuery): {
    skip: number;
    take: number;
} {
    return { skip: (page - 1) * pageSize, take: pageSize };
}

// The pagination half of an { items, pagination } body (conventions §3).
export function toPagination(
    totalItems: number,
    { page, pageSize }: PageQuery,
): PaginationMeta {
    return {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
    };
}
