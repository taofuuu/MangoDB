import type { Category } from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { ApiError } from './api-error';
import { prisma } from './prisma';

// Listing create and edit endpoints share this check so an unknown category
// becomes a field-level 400 instead of a database foreign-key error.
export async function assertCategoriesExist(
    categoryIds: number[],
): Promise<void> {
    const uniqueCatIds = [...new Set(categoryIds)];
    if (uniqueCatIds.length === 0) return;

    const existingCats = await prisma.category.findMany({
        where: { categoryId: { in: uniqueCatIds } },
        select: { categoryId: true },
    });

    if (existingCats.length !== uniqueCatIds.length) {
        throw ApiError.validationFailed([
            {
                field: 'categoryIds',
                message: 'One or more selected categories do not exist',
            },
        ]);
    }
}

// GET /categories: the catalog, as the shared type names it.
export const categorySelect = {
    categoryId: true,
    categoryName: true,
} as const satisfies Prisma.CategorySelect;

export function toCategory(row: Category): Category {
    return { categoryId: row.categoryId, categoryName: row.categoryName };
}
