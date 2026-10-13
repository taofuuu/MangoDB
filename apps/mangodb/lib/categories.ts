import type { Category } from '@mangodb/shared';
import { apiFetch } from './api';

export function getCategories(): Promise<Category[]> {
    return apiFetch<Category[]>('/categories');
}
