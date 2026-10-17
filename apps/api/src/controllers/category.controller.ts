import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

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

    res.json(categories);
}
