import { ApiError } from './ApiError';
import { prisma } from './prisma';

// Listing create and edit endpoints share this check so an unknown category
// becomes a field-level 400 instead of a database foreign-key error.
export async function assertCategoriesExist(
    categoryIds: number[],
): Promise<void> {
    const uniqueCatIds = [...new Set(categoryIds)];
    if (uniqueCatIds.length === 0) return;

    const existingCats = await prisma.category.findMany({
        where: { catId: { in: uniqueCatIds } },
        select: { catId: true },
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
