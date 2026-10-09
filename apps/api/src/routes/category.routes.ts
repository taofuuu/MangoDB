import { Router } from 'express';
import { listCategories } from '../controllers/category.controller';

export const categoryRoutes = Router();

categoryRoutes.get('/', listCategories);
