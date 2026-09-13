import type { Certificate } from '@mangodb/shared';
import { apiFetch } from '@/lib/api';

export const getCertificates = async (): Promise<Certificate[]> => {
    return apiFetch<Certificate[]>('/certificates/mine', { method: 'GET' });
};
