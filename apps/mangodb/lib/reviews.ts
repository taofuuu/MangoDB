import type { CreateReviewRequest, Review } from '@mangodb/shared';
import { apiFetch } from '@/lib/api';
import { invalidateAfter } from '@/lib/apiCache';

// POST /projects/:projectId/review. The form passes the completed project's id
// here; this helper owns the endpoint call and the related cache invalidation.
export function createReview(
    projectId: number,
    body: CreateReviewRequest,
): Promise<Review> {
    return invalidateAfter(
        apiFetch<Review>(`/projects/${projectId}/review`, {
            method: 'POST',
            body: JSON.stringify(body),
        }),
        '/projects',
        '/companies',
    );
}
