import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    adminLogin,
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
// Here and not under /admin: that router is guarded by requireAuth, so a
// login route there would need a token to get a token.
authRoutes.post('/admin/login', adminLogin);
authRoutes.post('/check-availability', checkAvailability);

authRoutes.post('/logout', requireAuth, logout);
