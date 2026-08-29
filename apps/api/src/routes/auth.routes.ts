import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { logout } from '../controllers/auth.controller';

// Mounted at /auth. Registration (US1-1) and login (US1-2) go here too.
export const authRoutes = Router();

authRoutes.post('/logout', requireAuth, logout);
