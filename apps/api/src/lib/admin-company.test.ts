/*
 * Tests for getRating in lib/admin-company.ts (ADR 0018).
 *
 * - A Provider's reviews come from two paths: proposals it sent to jobs, and
 *   hire requests on its own services. Both count.
 * - The average is the mean of every score; ratingCount counts reviews.
 * - A project with no review yet adds nothing, and no reviews is null, not 0.
 *
 * The COMPLETED filter lives in the Prisma select, so it is not tested here.
 *
 * Run: npm test (in apps/api).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRating } from './admin-company';

function reviewed(scores: [number, number, number, number]) {
    const [
        workQualityScore,
        serviceScore,
        valueForMoneyScore,
        deliveryTimeScore,
    ] = scores;
    return {
        project: {
            review: {
                workQualityScore,
                serviceScore,
                valueForMoneyScore,
                deliveryTimeScore,
            },
        },
    };
}

const notReviewed = { project: { review: null } };

describe('getRating', () => {
    it('averages every score from both the job and the service path', () => {
        const rating = getRating({
            proposal: [reviewed([5, 5, 4, 4]), notReviewed],
            listing: [{ proposal: [reviewed([3, 3, 3, 4])] }],
        });

        // (18 + 13) / 8 = 3.875
        assert.deepEqual(rating, { averageRating: 3.9, ratingCount: 2 });
    });

    it('is null with no reviews', () => {
        const rating = getRating({
            proposal: [notReviewed],
            listing: [{ proposal: [] }],
        });

        assert.deepEqual(rating, { averageRating: null, ratingCount: 0 });
    });
});
