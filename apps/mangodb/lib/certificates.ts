import type { CertificateResponse } from '@/components/forms/AddCertificateForm';
import { apiFetch } from './api';

// Auth-gated: the API reads the provider id off the session cookie, so this
// always answers with the signed-in company's own certificates.
export function getCertificates(): Promise<CertificateResponse[]> {
    return apiFetch<CertificateResponse[]>('/certificates/provider');
}
