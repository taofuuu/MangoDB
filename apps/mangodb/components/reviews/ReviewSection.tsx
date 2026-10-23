'use client';

import { useState } from 'react';
import type { CreateReviewRequest, Review } from '@mangodb/shared';
import Button from '@/components/ui/Button';
import FieldError from '@/components/ui/FieldError';
import {
    type ReviewFormErrors,
    type ReviewScoreField,
    validateReviewForm,
} from '@/lib/validation/review';
import StarRating from './StarRating';

export type ReviewContent = Pick<
    Review,
    | 'workQualityScore'
    | 'serviceScore'
    | 'valueForMoneyScore'
    | 'deliveryTimeScore'
    | 'comment'
>;

type ReviewSectionProps = {
    initialReview?: ReviewContent | null | undefined;
    onSubmit?:
        ((review: CreateReviewRequest) => Promise<void> | void) | undefined;
    onCancel?: (() => void) | undefined;
};

const CRITERIA: Array<{ field: ReviewScoreField; label: string }> = [
    { field: 'workQualityScore', label: 'Work quality' },
    { field: 'serviceScore', label: 'Service' },
    { field: 'valueForMoneyScore', label: 'Value for money' },
    { field: 'deliveryTimeScore', label: 'Delivery time' },
];

const EMPTY_SCORES: Record<ReviewScoreField, number> = {
    workQualityScore: 0,
    serviceScore: 0,
    valueForMoneyScore: 0,
    deliveryTimeScore: 0,
};

export default function ReviewSection({
    initialReview = null,
    onSubmit,
    onCancel,
}: ReviewSectionProps) {
    const [scores, setScores] = useState(EMPTY_SCORES);
    const [comment, setComment] = useState('');
    const [errors, setErrors] = useState<ReviewFormErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedReview, setSubmittedReview] =
        useState<ReviewContent | null>(initialReview);

    const clearError = (field: keyof ReviewFormErrors) => {
        setErrors((previous) => {
            const next = { ...previous };
            delete next[field];
            return next;
        });
    };

    const setScore = (field: ReviewScoreField, value: number) => {
        setScores((previous) => ({ ...previous, [field]: value }));
        clearError(field);
    };

    const handleCancel = () => {
        setScores(EMPTY_SCORES);
        setComment('');
        setErrors({});
        setFormError(null);
        onCancel?.();
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        const draft: CreateReviewRequest = {
            ...scores,
            comment: comment.trim() || null,
        };
        const nextErrors = validateReviewForm(draft);
        setErrors(nextErrors);
        setFormError(null);
        if (Object.keys(nextErrors).length > 0) return;

        setIsSubmitting(true);
        try {
            await onSubmit?.(draft);
            setSubmittedReview({
                ...scores,
                comment: draft.comment ?? null,
            });
        } catch {
            setFormError(
                'The review could not be submitted. Please try again.',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submittedReview) {
        return (
            <section
                aria-labelledby="submitted-review-heading"
                className="rounded-popup border border-line bg-surface-white p-5 shadow-card sm:p-7"
            >
                <h2 id="submitted-review-heading" className="type-lg text-ink">
                    Submitted review
                </h2>
                <p className="mt-1 type-sm text-ink-soft">
                    Reviews are final after submission.
                </p>

                <div className="mt-6 grid gap-x-12 gap-y-4 sm:grid-cols-2">
                    {CRITERIA.map(({ field, label }) => (
                        <StarRating
                            key={field}
                            name={`submitted-${field}`}
                            label={label}
                            value={submittedReview[field]}
                        />
                    ))}
                </div>

                <div className="mt-6 border-t border-line pt-5">
                    <h3 className="type-sm text-ink">Comment</h3>
                    <p className="mt-2 whitespace-pre-wrap type-sm text-ink-soft">
                        {submittedReview.comment || 'No comment provided.'}
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section
            aria-labelledby="review-heading"
            className="rounded-popup border border-line bg-surface-white p-5 shadow-card sm:p-7"
        >
            <h2 id="review-heading" className="type-lg text-ink">
                Review project
            </h2>
            <p className="mt-1 type-sm text-ink-soft">
                Rate every criterion from 1 to 5 stars before submitting.
            </p>

            <form onSubmit={handleSubmit} noValidate>
                <div className="mt-6 grid gap-x-12 gap-y-5 sm:grid-cols-2">
                    {CRITERIA.map(({ field, label }) => (
                        <div key={field}>
                            <StarRating
                                name={field}
                                label={label}
                                value={scores[field]}
                                onChange={(value) => setScore(field, value)}
                                errorId={
                                    errors[field]
                                        ? `review-${field}-error`
                                        : undefined
                                }
                            />
                            <FieldError
                                id={`review-${field}-error`}
                                message={errors[field]}
                            />
                        </div>
                    ))}
                </div>

                <div className="mt-6 border-t border-line pt-5">
                    <div className="flex items-end justify-between gap-4">
                        <label
                            htmlFor="review-comment"
                            className="type-sm text-ink"
                        >
                            Comment{' '}
                            <span className="text-ink-placeholder">
                                (optional)
                            </span>
                        </label>
                        <span
                            className={`type-xs ${
                                comment.length > 500
                                    ? 'text-danger'
                                    : 'text-ink-placeholder'
                            }`}
                            aria-live="polite"
                        >
                            {comment.length}/500
                        </span>
                    </div>
                    <textarea
                        id="review-comment"
                        value={comment}
                        onChange={(event) => {
                            setComment(event.target.value);
                            clearError('comment');
                        }}
                        rows={5}
                        placeholder="Share details about your experience"
                        aria-invalid={errors.comment ? true : undefined}
                        aria-describedby={
                            errors.comment ? 'review-comment-error' : undefined
                        }
                        className={`mt-2 block w-full resize-none rounded-input border bg-surface-white px-4 py-3 type-sm text-ink placeholder:text-ink-placeholder focus:ring-1 focus:outline-none ${
                            errors.comment
                                ? 'border-danger focus:ring-danger'
                                : 'border-brand focus:ring-brand'
                        }`}
                    />
                    <FieldError
                        id="review-comment-error"
                        message={errors.comment}
                    />
                </div>

                {formError && (
                    <p role="alert" className="mt-4 type-sm text-danger">
                        {formError}
                    </p>
                )}

                <div className="mt-6 flex justify-end gap-3">
                    <Button
                        variant="muted"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className="min-w-28 px-5 py-2 type-sm"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        isLoading={isSubmitting}
                        loadingLabel="Submitting…"
                        className="min-w-36 px-5 py-2 type-sm"
                    >
                        Submit review
                    </Button>
                </div>
            </form>
        </section>
    );
}
