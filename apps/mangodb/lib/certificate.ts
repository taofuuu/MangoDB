import { apiFetch } from '@/lib/api';
import type { CertificateResponse } from '@/components/forms/AddCertificateForm';

export const getCertificates = async (): Promise<CertificateResponse[]> => {
    return apiFetch<CertificateResponse[]>('/certificates/provider', {
        method: 'GET',
    });
};
