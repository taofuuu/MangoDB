import type { Certificate } from '@mangodb/shared';
import { apiFetch } from '@/lib/api';
import { cachedGet, invalidateAfter } from '@/lib/apiCache';
import { formatMonthYear } from '@/lib/dates';

// Every certificate request in one place, so a path or a method is written
// once. Three of these four used to be `apiFetch` called inline from a form,
// which is how `/certificates/provider` ended up needing a rename in four
// files instead of one.
//
// All four are provider-only and act on the caller's own certificates — the
// API works that out from the session, so none of them takes an owner id.

export function listMyCertificates(): Promise<Certificate[]> {
    const path = '/certificates/mine';
    return cachedGet(path, () =>
        apiFetch<Certificate[]>(path, { method: 'GET' }),
    );
}

// The one read of someone else's: another company's certificates, for its
// public profile. Any signed-in company may call it.
export function listCertificates({
    companyId,
}: {
    companyId: number;
}): Promise<Certificate[]> {
    const query = new URLSearchParams({ companyId: String(companyId) });

    const path = `/certificates?${query.toString()}`;
    return cachedGet(path, () => apiFetch<Certificate[]>(path));
}

// FormData, not JSON: both writes carry the image, so the whole body is
// multipart. The file part is `certImage`; see docs/conventions.md section 1 —
// a multipart field name is a wire name like any other.
export function createCertificate(body: FormData): Promise<Certificate> {
    return invalidateAfter(
        apiFetch<Certificate>('/certificates', { method: 'POST', body }),
        '/certificates',
    );
}

export function updateCertificate(
    certificateId: number,
    body: FormData,
): Promise<Certificate> {
    return invalidateAfter(
        apiFetch<Certificate>(`/certificates/${certificateId}`, {
            method: 'PATCH',
            body,
        }),
        '/certificates',
    );
}

export function deleteCertificate(certificateId: number): Promise<void> {
    return invalidateAfter(
        apiFetch<void>(`/certificates/${certificateId}`, {
            method: 'DELETE',
        }),
        '/certificates',
    );
}

// The date line under a certificate: "Issued May 2024 · Expires May 2027".
// Every part is optional, so it keeps whatever was filled in rather than
// rendering a half-empty "Issued  ".
export function formatCertificatePeriod(
    dates: Pick<
        Certificate,
        'issueMonth' | 'issueYear' | 'expireMonth' | 'expireYear'
    >,
): string {
    const issued = formatMonthYear(dates.issueMonth, dates.issueYear);
    const expires = formatMonthYear(dates.expireMonth, dates.expireYear);

    if (issued && expires) return `Issued ${issued} · Expires ${expires}`;
    if (issued) return `Issued ${issued}`;
    if (expires) return `Expires ${expires}`;
    return '';
}
