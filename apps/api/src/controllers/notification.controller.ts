import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { notificationSelect, toNotification } from '../lib/notification';

// The bell is a short list in a popup, not a page (ADR 0017), so it gets the
// newest few and no paging.
const BELL_SIZE = 20;

// T4.1.5. The caller's newest notices, read or not, newest first. The id
// breaks a tie between two saved in the same instant.
export async function listMyNotifications(
    req: Request,
    res: Response,
): Promise<void> {
    const rows = await prisma.notification.findMany({
        where: { recipientId: req.auth!.companyId },
        orderBy: [{ createdAt: 'desc' }, { notificationId: 'desc' }],
        take: BELL_SIZE,
        select: notificationSelect,
    });
    res.json(rows.map(toNotification));
}

// T4.1.5. Opening the bell marks every unread notice of the caller read, so
// its badge clears. Already-read ones keep the time they were first read.
export async function markMyNotificationsRead(
    req: Request,
    res: Response,
): Promise<void> {
    await prisma.notification.updateMany({
        where: { recipientId: req.auth!.companyId, readAt: null },
        data: { readAt: new Date() },
    });
    res.status(204).end();
}
