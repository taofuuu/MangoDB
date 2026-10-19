import type { Category } from '@mangodb/shared';
import { apiFetch } from './api';
import { cachedGet } from './apiCache';

// The fixed catalog (ADR 0002). It changes only with a migration.
export function listCategories(): Promise<Category[]> {
    const path = '/categories';
    return cachedGet(path, () => apiFetch<Category[]>(path));
}
