import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateReviewForm } from './review';

const validReview = {
    workQualityScore: 5,
    serviceScore: 4,
    valueForMoneyScore: 5,
    deliveryTimeScore: 3,
    comment: 'Clear communication and thoughtful work.',
};

describe('validateReviewForm', () => {
    it('accepts four valid scores and an optional comment', () => {
        assert.deepEqual(validateReviewForm(validReview), {});
        assert.deepEqual(
            validateReviewForm({ ...validReview, comment: undefined }),
            {},
        );
    });

    it('requires every score to be a whole number from 1 to 5', () => {
        const errors = validateReviewForm({
            ...validReview,
            workQualityScore: 0,
            serviceScore: 6,
            valueForMoneyScore: 2.5,
        });

        assert.equal(
            errors.workQualityScore,
            'Choose a rating from 1 to 5 stars.',
        );
        assert.equal(errors.serviceScore, 'Choose a rating from 1 to 5 stars.');
        assert.equal(
            errors.valueForMoneyScore,
            'Choose a rating from 1 to 5 stars.',
        );
        assert.equal(errors.deliveryTimeScore, undefined);
    });

    it('rejects a comment longer than 500 characters', () => {
        const errors = validateReviewForm({
            ...validReview,
            comment: 'a'.repeat(501),
        });

        assert.equal(errors.comment, 'Comment cannot exceed 500 characters.');
    });
});
