import type { ServiceSummary } from '@mangodb/shared';
import { apiFetch } from '@/lib/api';

export function createService(body: FormData): Promise<ServiceSummary> {
    return apiFetch<ServiceSummary>('/services', { method: 'POST', body });
}
