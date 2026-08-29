import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { logout, register } from '../controllers/auth.controller';

// Mounted at /auth. Login (US1-2) goes here too.
export const authRoutes = Router();

// Public: the caller has no token yet, which is the point.
authRoutes.post('/register', register);

authRoutes.post('/logout', requireAuth, logout);
