import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    checkAvailability,
    logout,
    register,
} from '../controllers/auth.controller';

// Mounted at /auth. Login (US1-2) goes here too.
export const authRoutes = Router();

// Public: no token yet. check-availability feeds the signup form's inline hint.
authRoutes.post('/register', register);
authRoutes.post('/check-availability', checkAvailability);

authRoutes.post('/logout', requireAuth, logout);
