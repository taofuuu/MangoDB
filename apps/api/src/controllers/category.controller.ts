import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma'; // Adjust this import to match your project

export async function listCategories(
    _req: Request,
    res: Response,
): Promise<void> {
    const categories = await prisma.category.findMany({
        orderBy: {
            categoryName: 'asc',
        },
        select: {
            categoryId: true,
            categoryName: true,
        },
    });

    // The wire still says catId / catName until round 2's Phase 2 flip;
    // Prisma already says categoryId / categoryName.
    res.json(
        categories.map((c) => ({
            catId: c.categoryId,
            catName: c.categoryName,
        })),
    );
}
