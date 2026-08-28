import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getCurrentUser } from '../controllers/auth.controller';
import { authRoutes } from './auth.routes';
import { adminRoutes } from './admin.routes';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/admin', adminRoutes);

// At the root because the API guide documents it there; US1-4 replaces it.
routes.get('/me', requireAuth, getCurrentUser);
