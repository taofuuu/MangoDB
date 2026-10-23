import type { Review } from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';

// US5-1, ADR 0018. A completed project's review.
export const reviewSelect = {
    reviewId: true,
    projectId: true,
    workQualityScore: true,
    serviceScore: true,
    valueForMoneyScore: true,
    deliveryTimeScore: true,
    comment: true,
    createdAt: true,
} as const satisfies Prisma.ReviewSelect;

export type ReviewRow = {
    reviewId: number;
    projectId: number;
    workQualityScore: number;
    serviceScore: number;
    valueForMoneyScore: number;
    deliveryTimeScore: number;
    comment: string | null;
    createdAt: Date;
};

// Date does not survive JSON as the frontend expects, so createdAt is converted
// to an ISO timestamp string per conventions section 10.
export function toReview(row: ReviewRow): Review {
    return { ...row, createdAt: row.createdAt.toISOString() };
}
