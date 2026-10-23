/*
 * Tests for provider rating helper in lib/rating.ts (ADR 0018, T5.1.3).
 *
 * - A Provider's reviews come from two paths: proposals it sent to jobs, and
 *   hire requests on its own services. Both count.
 * - The average is the mean of every score, rounded to 1 decimal place;
 *   ratingCount counts reviews.
 * - A project with no review yet adds nothing, and no reviews is null, not 0.
 * - getProviderRating queries the database and applies getRating.
 *
 * Run: npm test (in apps/api).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getProviderRating, getRating } from './rating';
import type { PrismaClient } from '../generated/prisma/client';

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

        // (18 + 13) / 8 = 3.875 -> rounds to 3.9
        assert.deepEqual(rating, { averageRating: 3.9, ratingCount: 2 });
    });

    it('is null with no reviews', () => {
        const rating = getRating({
            proposal: [notReviewed],
            listing: [{ proposal: [] }],
        });

        assert.deepEqual(rating, { averageRating: null, ratingCount: 0 });
    });

    it('computes accurately for a single review', () => {
        const rating = getRating({
            proposal: [reviewed([5, 5, 5, 5])],
            listing: [],
        });

        assert.deepEqual(rating, { averageRating: 5.0, ratingCount: 1 });
    });
});

describe('getProviderRating', () => {
    it('queries provider by companyId and calculates rating', async () => {
        const fakeDb = {
            company: {
                findUnique: async () => ({
                    proposal: [reviewed([4, 4, 4, 4])],
                    listing: [{ proposal: [reviewed([5, 5, 5, 5])] }],
                }),
            },
        } as unknown as PrismaClient;

        const rating = await getProviderRating(10, fakeDb);
        // (16 + 20) / 8 = 4.5
        assert.deepEqual(rating, { averageRating: 4.5, ratingCount: 2 });
    });

    it('returns null rating if company is not found', async () => {
        const fakeDb = {
            company: {
                findUnique: async () => null,
            },
        } as unknown as PrismaClient;

        const rating = await getProviderRating(999, fakeDb);
        assert.deepEqual(rating, { averageRating: null, ratingCount: 0 });
    });
});
