import { Router } from 'express';
import { listCategories } from '../controllers/category.controller';

export const categoryRoutes = Router();

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: List the category catalog
 *     description: The fixed catalog a listing picks from (ADR 0002), by name.
 *     security: []
 *     responses:
 *       '200':
 *         description: Every category
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
categoryRoutes.get('/', listCategories);
