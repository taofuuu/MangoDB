import type { CreateReviewRequest, Review } from '@mangodb/shared';
import { apiFetch } from '@/lib/api';
import { invalidateAfter } from '@/lib/apiCache';

// POST /projects/:projectId/review. The project page owns the project fetch and
// only passes its id here, so mounting this section does not introduce a second
// project request (T4.9.13).
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
