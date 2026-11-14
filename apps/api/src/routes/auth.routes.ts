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
/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a company and sign it in
 *     description: US1-1. Also sets the access_token cookie.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       '201':
 *         description: Registered and signed in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 */
authRoutes.post('/register', register);

// loginLimiter on both doors: 10 failed tries per email, then 429.
/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in as a company
 *     description: US1-2. Copy accessToken into Authorize to try the other endpoints. Admins get 403 here.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       '200':
 *         description: Signed in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '429':
 *         $ref: '#/components/responses/TooManyRequests'
 */
authRoutes.post('/login', loginLimiter, login);

// Here and not under /admin: that router is guarded by requireAuth, so a
// login route there would need a token to get a token.
/**
 * @openapi
 * /auth/admin/login:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in as an administrator
 *     description: US6-1. Company accounts get 403 here.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       '200':
 *         description: Signed in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '429':
 *         $ref: '#/components/responses/TooManyRequests'
 */
authRoutes.post('/admin/login', loginLimiter, adminLogin);

/**
 * @openapi
 * /auth/check-availability:
 *   post:
 *     tags: [Auth]
 *     summary: Check if a username and email are free
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IdentityCheck'
 *     responses:
 *       '200':
 *         description: Availability of each field
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IdentityAvailability'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 */
authRoutes.post('/check-availability', checkAvailability);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Sign out
 *     description: US1-3. Revokes the token and clears the cookie.
 *     responses:
 *       '204':
 *         description: Signed out
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 */
authRoutes.post('/logout', requireAuth, logout);
