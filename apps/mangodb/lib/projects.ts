import type {
    Paginated,
    ProjectDetail,
    ProjectSummary,
    ProjectUpdate,
    Quotation,
    Review,
} from '@mangodb/shared';
import { apiFetch } from '@/lib/api';
import { cachedGet, invalidateAfter } from '@/lib/apiCache';

// US4-9. The caller's projects, as Provider and as Receiver, paged.
export function listMyProjects(
    page: number = 1,
    pageSize: number = 50,
): Promise<Paginated<ProjectSummary>> {
    const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });
    const path = `/projects/mine?${params.toString()}`;
    return cachedGet(path, () => apiFetch<Paginated<ProjectSummary>>(path));
}

// US4-9. One project, for its two parties.
export function getProject(projectId: number): Promise<ProjectDetail> {
    const path = `/projects/${projectId}`;
    return cachedGet(path, () => apiFetch<ProjectDetail>(path));
}

// US4-9. Timeline updates for a project (oldest first).
export function listProjectUpdates(
    projectId: number,
): Promise<ProjectUpdate[]> {
    const path = `/projects/${projectId}/updates`;
    return cachedGet(path, () => apiFetch<ProjectUpdate[]>(path));
}

// US4-10. Provider adds a progress update note.
export function createProjectUpdate(
    projectId: number,
    updateText: string,
): Promise<ProjectUpdate> {
    return invalidateAfter(
        apiFetch<ProjectUpdate>(`/projects/${projectId}/updates`, {
            method: 'POST',
            body: JSON.stringify({ updateText }),
        }),
        `/projects/${projectId}`,
        '/projects/mine',
    );
}

// US4-3. Project quotations.
export function listQuotations(projectId: number): Promise<Quotation[]> {
    const path = `/projects/${projectId}/quotations`;
    return cachedGet(path, () => apiFetch<Quotation[]>(path));
}

// US4-1. Provider uploads quotation PDF.
export function uploadQuotation(
    projectId: number,
    file: File,
): Promise<Quotation> {
    const body = new FormData();
    body.append('file', file);
    return invalidateAfter(
        apiFetch<Quotation>(`/projects/${projectId}/quotations`, {
            method: 'POST',
            body,
        }),
        `/projects/${projectId}`,
        '/projects/mine',
    );
}

// US4-2. Provider deletes a pending quotation.
export function deleteQuotation(
    quotationId: number,
    projectId: number,
): Promise<void> {
    return invalidateAfter(
        apiFetch<void>(`/quotations/${quotationId}`, {
            method: 'DELETE',
        }),
        `/projects/${projectId}`,
        '/projects/mine',
    );
}

// US4-4. Receiver accepts quotation (moves project to AWAITING_DEPOSIT).
export function acceptQuotation(
    quotationId: number,
    projectId: number,
): Promise<Quotation> {
    return invalidateAfter(
        apiFetch<Quotation>(`/quotations/${quotationId}/accept`, {
            method: 'POST',
        }),
        `/projects/${projectId}`,
        '/projects/mine',
    );
}

// US4-5. Receiver rejects quotation.
export function rejectQuotation(
    quotationId: number,
    projectId: number,
): Promise<Quotation> {
    return invalidateAfter(
        apiFetch<Quotation>(`/quotations/${quotationId}/reject`, {
            method: 'POST',
        }),
        `/projects/${projectId}`,
        '/projects/mine',
    );
}

// US4-6. Receiver reports deposit.
export function reportDeposit(projectId: number): Promise<void> {
    return invalidateAfter(
        apiFetch<void>(`/projects/${projectId}/report-deposit`, {
            method: 'POST',
        }),
        `/projects/${projectId}`,
        '/projects/mine',
    );
}

// US4-7. Provider confirms deposit.
export function confirmDeposit(projectId: number): Promise<void> {
    return invalidateAfter(
        apiFetch<void>(`/projects/${projectId}/confirm-deposit`, {
            method: 'POST',
        }),
        `/projects/${projectId}`,
        '/projects/mine',
    );
}

// US4-11. Provider submits work.
export function submitWork(projectId: number): Promise<void> {
    return invalidateAfter(
        apiFetch<void>(`/projects/${projectId}/submit-work`, {
            method: 'POST',
        }),
        `/projects/${projectId}`,
        '/projects/mine',
    );
}

// US4-12. Receiver rejects work with reason.
export function rejectWork(projectId: number, reason: string): Promise<void> {
    return invalidateAfter(
        apiFetch<void>(`/projects/${projectId}/reject-work`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        }),
        `/projects/${projectId}`,
        '/projects/mine',
    );
}

// US4-13. Receiver accepts work.
export function acceptWork(projectId: number): Promise<void> {
    return invalidateAfter(
        apiFetch<void>(`/projects/${projectId}/accept-work`, {
            method: 'POST',
        }),
        `/projects/${projectId}`,
        '/projects/mine',
        '/companies',
    );
}

// US4-8. Cancel project before work starts.
export function cancelProject(projectId: number): Promise<void> {
    return invalidateAfter(
        apiFetch<void>(`/projects/${projectId}/cancel`, {
            method: 'POST',
        }),
        `/projects/${projectId}`,
        '/projects/mine',
    );
}

// US5-2. Project review.
export function getProjectReview(projectId: number): Promise<Review> {
    const path = `/projects/${projectId}/review`;
    return cachedGet(path, () => apiFetch<Review>(path));
}
