import type { Notification } from '@mangodb/shared';
import { apiFetch } from '@/lib/api';
import { cachedGet, invalidateAfter } from '@/lib/apiCache';

// T4.1.5. The caller's newest notices, for the navbar bell.
export function listMyNotifications(): Promise<Notification[]> {
    const path = '/notifications/mine';
    return cachedGet(path, () => apiFetch<Notification[]>(path));
}

// T4.1.5. Opening the bell marks every notice read, so its badge clears.
export function markNotificationsRead(): Promise<void> {
    return invalidateAfter(
        apiFetch<void>('/notifications/mine/read', { method: 'POST' }),
        '/notifications',
    );
}
