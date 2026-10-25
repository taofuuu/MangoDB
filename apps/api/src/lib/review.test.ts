/*
 * Tests for review DTO mapper in lib/review.ts (US5-1, ADR 0018).
 *
 * Run: npm test (in apps/api).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toCompanyReview, toReview, type ReviewRow } from './review';

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

describe('toCompanyReview', () => {
    it('maps review on a Job project with the job owner as Receiver', () => {
        const row = {
            reviewId: 10,
            projectId: 100,
            workQualityScore: 5,
            serviceScore: 4,
            valueForMoneyScore: 5,
            deliveryTimeScore: 4,
            comment: 'Great contractor',
            createdAt: new Date('2026-10-23T15:00:00.000Z'),
            project: {
                proposal: {
                    senderId: 7, // Provider
                    sender: {
                        companyId: 7,
                        companyName: 'Provider Co',
                        companyPhoto: null,
                    },
                    listing: {
                        listingType: 'JOB',
                        companyId: 2, // Receiver (Job owner)
                        company: {
                            companyId: 2,
                            companyName: 'Job Owner Receiver',
                            companyPhoto: 'https://example.com/receiver.png',
                        },
                    },
                },
            },
        };

        const result = toCompanyReview(row);

        assert.deepEqual(result, {
            reviewId: 10,
            projectId: 100,
            workQualityScore: 5,
            serviceScore: 4,
            valueForMoneyScore: 5,
            deliveryTimeScore: 4,
            comment: 'Great contractor',
            createdAt: '2026-10-23T15:00:00.000Z',
            receiver: {
                companyId: 2,
                companyName: 'Job Owner Receiver',
                companyPhoto: 'https://example.com/receiver.png',
            },
        });
    });

    it('maps review on a Service project with the proposal sender as Receiver', () => {
        const row = {
            reviewId: 11,
            projectId: 101,
            workQualityScore: 4,
            serviceScore: 5,
            valueForMoneyScore: 4,
            deliveryTimeScore: 5,
            comment: 'Great service provider',
            createdAt: new Date('2026-10-23T16:00:00.000Z'),
            project: {
                proposal: {
                    senderId: 3, // Receiver (hire request sender)
                    sender: {
                        companyId: 3,
                        companyName: 'Hire Requester Receiver',
                        companyPhoto: null,
                    },
                    listing: {
                        listingType: 'SERVICE',
                        companyId: 7, // Provider (Service owner)
                        company: {
                            companyId: 7,
                            companyName: 'Provider Co',
                            companyPhoto: null,
                        },
                    },
                },
            },
        };

        const result = toCompanyReview(row);

        assert.deepEqual(result, {
            reviewId: 11,
            projectId: 101,
            workQualityScore: 4,
            serviceScore: 5,
            valueForMoneyScore: 4,
            deliveryTimeScore: 5,
            comment: 'Great service provider',
            createdAt: '2026-10-23T16:00:00.000Z',
            receiver: {
                companyId: 3,
                companyName: 'Hire Requester Receiver',
                companyPhoto: null,
            },
        });
    });
});
