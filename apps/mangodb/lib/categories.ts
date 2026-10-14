import type { Category } from '@mangodb/shared';
import { apiFetch } from './api';

export function listCategories(): Promise<Category[]> {
    return apiFetch<Category[]>('/categories');
}
