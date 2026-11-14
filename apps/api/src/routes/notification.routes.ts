import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    listMyNotifications,
    markMyNotificationsRead,
} from '../controllers/notification.controller';

export const notificationRoutes = Router();

// T4.1.5. The navbar bell's list. No requireRole: every company gets notices,
// as Provider and as Receiver.
/**
 * @openapi
 * /notifications/mine:
 *   get:
 *     tags: [Notifications]
 *     summary: List my notifications
 *     description: >-
 *       T4.1.5, ADR 0017. The newest 20, read or not, newest first. Not paged:
 *       the bell is a short popup.
 *     responses:
 *       '200':
 *         description: The newest notices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 */
notificationRoutes.get('/mine', requireAuth, listMyNotifications);

// T4.1.5. Opening the bell clears its badge.
/**
 * @openapi
 * /notifications/mine/read:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark all my notifications read
 *     description: T4.1.5. Sets readAt on every unread notice of the caller.
 *     responses:
 *       '204':
 *         description: All read
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 */
notificationRoutes.post('/mine/read', requireAuth, markMyNotificationsRead);
