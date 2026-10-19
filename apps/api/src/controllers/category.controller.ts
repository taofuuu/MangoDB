import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { categorySelect, toCategory } from '../lib/category';

// GET /categories. The fixed catalog a listing picks from (ADR 0002), by name.
export async function listCategories(
    _req: Request,
    res: Response,
): Promise<void> {
    const categories = await prisma.category.findMany({
        orderBy: { categoryName: 'asc' },
        select: categorySelect,
    });

    res.json(categories.map(toCategory));
}
