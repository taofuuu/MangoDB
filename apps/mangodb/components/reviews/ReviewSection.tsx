'use client';

import type { Review } from '@mangodb/shared';
import Button from '@/components/ui/Button';
import FieldError from '@/components/ui/FieldError';
import type { ReviewScoreField } from '@/lib/validation/review';
import StarRating from './StarRating';
import { useReviewForm } from './useReviewForm';

export type ReviewContent = Pick<
    Review,
    | 'workQualityScore'
    | 'serviceScore'
    | 'valueForMoneyScore'
    | 'deliveryTimeScore'
    | 'comment'
>;

type ReviewSectionProps = {
    projectId: number;
    initialReview?: ReviewContent | null | undefined;
    onCancel?: (() => void) | undefined;
    onSubmitted?: (() => void) | undefined;
};

const CRITERIA: Array<{ field: ReviewScoreField; label: string }> = [
    { field: 'workQualityScore', label: 'Work quality' },
    { field: 'serviceScore', label: 'Service' },
    { field: 'valueForMoneyScore', label: 'Value for money' },
    { field: 'deliveryTimeScore', label: 'Delivery time' },
];

export default function ReviewSection({
    initialReview = null,
    onCancel,
    onSubmitted,
    projectId,
}: ReviewSectionProps) {
    const {
        values,
        setField,
        errors,
        formError,
        isSubmitting,
        reset,
        handleSubmit,
    } = useReviewForm(projectId, onSubmitted);
    const commentLength = values.comment.trim().length;

    const handleCancel = () => {
        reset();
        onCancel?.();
    };

    if (initialReview) {
        return (
            <section
                aria-labelledby="submitted-review-heading"
                className="w-full"
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
                            value={initialReview[field]}
                        />
                    ))}
                </div>

                <div className="mt-6 border-t border-line pt-5">
                    <h3 className="type-sm text-ink">Comment</h3>
                    <p className="mt-2 whitespace-pre-wrap type-sm text-ink-soft">
                        {initialReview.comment || 'No comment provided.'}
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section aria-labelledby="review-heading" className="w-full">
            <h2 id="review-heading" className="type-sm text-ink">
                Rating Scores
            </h2>

            <form onSubmit={handleSubmit} noValidate>
                <div className="mt-5 grid gap-x-16 gap-y-4 sm:grid-cols-2">
                    {CRITERIA.map(({ field, label }) => (
                        <div key={field}>
                            <StarRating
                                name={field}
                                label={label}
                                value={values[field]}
                                onChange={(value) => setField(field, value)}
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
                                commentLength > 500
                                    ? 'text-danger'
                                    : 'text-ink-placeholder'
                            }`}
                            aria-live="polite"
                        >
                            {commentLength}/500
                        </span>
                    </div>
                    <textarea
                        id="review-comment"
                        value={values.comment}
                        onChange={(event) =>
                            setField('comment', event.target.value)
                        }
                        rows={5}
                        placeholder="Up to 500 characters"
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
