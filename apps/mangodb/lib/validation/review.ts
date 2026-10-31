import type { CreateReviewRequest } from '@mangodb/shared';

export type ReviewScoreField = Exclude<keyof CreateReviewRequest, 'comment'>;

export type ReviewFormErrors = Partial<
    Record<ReviewScoreField | 'comment', string>
>;

const SCORE_FIELDS: ReviewScoreField[] = [
    'workQualityScore',
    'serviceScore',
    'valueForMoneyScore',
    'deliveryTimeScore',
];

// ADR 0018: every criterion is required and is a whole number from 1 to 5.
// The comment is optional, but the API stores at most 500 characters.
export function validateReviewForm(
    review: CreateReviewRequest,
): ReviewFormErrors {
    const errors: ReviewFormErrors = {};

    for (const field of SCORE_FIELDS) {
        const score = review[field];
        if (!Number.isInteger(score) || score < 1 || score > 5) {
            errors[field] = 'Choose a rating from 1 to 5 stars.';
        }
    }

    if ((review.comment?.length ?? 0) > 500) {
        errors.comment = 'Comment cannot exceed 500 characters.';
    }

    return errors;
}
