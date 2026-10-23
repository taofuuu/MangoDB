/*
 * Tests for review DTO mapper in lib/review.ts (US5-1, ADR 0018).
 *
 * Run: npm test (in apps/api).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toReview, type ReviewRow } from './review';

describe('toReview', () => {
    it('maps review row fields and converts createdAt Date to ISO string', () => {
        const row: ReviewRow = {
            reviewId: 1,
            projectId: 42,
            workQualityScore: 5,
            serviceScore: 4,
            valueForMoneyScore: 4,
            deliveryTimeScore: 5,
            comment: 'Excellent work delivered on time.',
            createdAt: new Date('2026-10-23T12:00:00.000Z'),
        };

        const result = toReview(row);

        assert.deepEqual(result, {
            reviewId: 1,
            projectId: 42,
            workQualityScore: 5,
            serviceScore: 4,
            valueForMoneyScore: 4,
            deliveryTimeScore: 5,
            comment: 'Excellent work delivered on time.',
            createdAt: '2026-10-23T12:00:00.000Z',
        });
    });

    it('handles null comment', () => {
        const row: ReviewRow = {
            reviewId: 2,
            projectId: 43,
            workQualityScore: 3,
            serviceScore: 3,
            valueForMoneyScore: 3,
            deliveryTimeScore: 3,
            comment: null,
            createdAt: new Date('2026-10-23T12:00:00.000Z'),
        };

        const result = toReview(row);

        assert.equal(result.comment, null);
    });
});
