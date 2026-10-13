import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma'; // Adjust this import to match your project

export async function listCategories(
    _req: Request,
    res: Response,
): Promise<void> {
    const categories = await prisma.category.findMany({
        orderBy: {
            catName: 'asc',
        },
        select: {
            catId: true,
            catName: true,
        },
    });

    res.json(categories);
}
