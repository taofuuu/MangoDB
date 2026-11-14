import { type FormEvent, useState } from 'react';
import type { CreateReviewRequest } from '@mangodb/shared';
import { createReview } from '@/lib/reviews';
import { toFormErrors } from '@/lib/validation/formErrors';
import {
    type ReviewFormErrors,
    validateReviewForm,
} from '@/lib/validation/review';

export type ReviewValues = {
    workQualityScore: number;
    serviceScore: number;
    valueForMoneyScore: number;
    deliveryTimeScore: number;
    comment: string;
};

const EMPTY_VALUES: ReviewValues = {
    workQualityScore: 0,
    serviceScore: 0,
    valueForMoneyScore: 0,
    deliveryTimeScore: 0,
    comment: '',
};

const REVIEW_FIELDS: Record<string, keyof ReviewFormErrors> = {
    workQualityScore: 'workQualityScore',
    serviceScore: 'serviceScore',
    valueForMoneyScore: 'valueForMoneyScore',
    deliveryTimeScore: 'deliveryTimeScore',
    comment: 'comment',
};

// Everything ReviewSection does besides drawing: form values, validation, and
// saving the final review.
export function useReviewForm(
    projectId: number,
    onSubmitted?: (() => void) | undefined,
) {
    const [values, setValues] = useState<ReviewValues>(EMPTY_VALUES);
    const [errors, setErrors] = useState<ReviewFormErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function setField<Field extends keyof ReviewValues>(
        field: Field,
        value: ReviewValues[Field],
    ) {
        setValues((previous) => ({ ...previous, [field]: value }));
        setErrors((previous) => ({ ...previous, [field]: undefined }));
    }

    function reset() {
        setValues(EMPTY_VALUES);
        setErrors({});
        setFormError(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isSubmitting) return;

        const request: CreateReviewRequest = {
            ...values,
            comment: values.comment.trim() || null,
        };
        const nextErrors = validateReviewForm(request);
        setErrors(nextErrors);
        setFormError(null);
        if (Object.keys(nextErrors).length > 0) return;

        setIsSubmitting(true);
        try {
            await createReview(projectId, request);
            onSubmitted?.();
        } catch (cause) {
            const next = toFormErrors(cause, REVIEW_FIELDS);
            setErrors(next.fields);
            setFormError(next.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return {
        values,
        setField,
        errors,
        formError,
        isSubmitting,
        reset,
        handleSubmit,
    };
}
