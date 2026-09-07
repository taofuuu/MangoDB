import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    checkAvailability,
    login,
    logout,
    register,
} from '../controllers/auth.controller';

// Mounted at /auth.
export const authRoutes = Router();

// Public: no token yet. check-availability feeds the signup form's inline hint.
authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.post('/check-availability', checkAvailability);

authRoutes.post('/logout', requireAuth, logout);
