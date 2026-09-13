import type { Certificate } from '@mangodb/shared';
import { apiFetch } from '@/lib/api';

// Every certificate request in one place, so a path or a method is written
// once. Three of these four used to be `apiFetch` called inline from a form,
// which is how `/certificates/provider` ended up needing a rename in four
// files instead of one.
//
// All four are provider-only and act on the caller's own certificates — the
// API works that out from the session, so none of them takes an owner id.

export function getCertificates(): Promise<Certificate[]> {
    return apiFetch<Certificate[]>('/certificates/mine', { method: 'GET' });
}

// FormData, not JSON: both writes carry the image, so the whole body is
// multipart. The file part is `certImage`; see docs/conventions.md section 1 —
// a multipart field name is a wire name like any other.
export function createCertificate(body: FormData): Promise<Certificate> {
    return apiFetch<Certificate>('/certificates', { method: 'POST', body });
}

export function updateCertificate(
    certificateId: number,
    body: FormData,
): Promise<Certificate> {
    return apiFetch<Certificate>(`/certificates/${certificateId}`, {
        method: 'PATCH',
        body,
    });
}

export function deleteCertificate(certificateId: number): Promise<void> {
    return apiFetch<void>(`/certificates/${certificateId}`, {
        method: 'DELETE',
    });
}
