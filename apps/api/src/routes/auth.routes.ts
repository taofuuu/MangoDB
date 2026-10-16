import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimit';
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
// loginLimiter on both doors: 10 failed tries per email, then 429.
authRoutes.post('/login', loginLimiter, login);
// Here and not under /admin: that router is guarded by requireAuth, so a
// login route there would need a token to get a token.
authRoutes.post('/admin/login', loginLimiter, adminLogin);
authRoutes.post('/check-availability', checkAvailability);

authRoutes.post('/logout', requireAuth, logout);
