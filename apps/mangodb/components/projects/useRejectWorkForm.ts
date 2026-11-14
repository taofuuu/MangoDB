'use client';

import { type FormEvent, useState } from 'react';
import { validateWorkRejectionReason } from '@/lib/validation/project';

type RejectWorkValues = {
    reason: string;
};

const EMPTY_VALUES: RejectWorkValues = { reason: '' };

// Everything RejectWorkModal does besides rendering: the field value, its
// client-side validation, and saving the rejection reason.
export function useRejectWorkForm(
    onSubmit: (reason: string) => Promise<void>,
    onSubmitted: () => void,
) {
    const [values, setValues] = useState<RejectWorkValues>(EMPTY_VALUES);
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function setField<Field extends keyof RejectWorkValues>(
        field: Field,
        value: RejectWorkValues[Field],
    ) {
        setValues((previous) => ({ ...previous, [field]: value }));
        setFieldError(null);
    }

    function reset() {
        setValues(EMPTY_VALUES);
        setFieldError(null);
        setSubmitError(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isSubmitting) return;

        const validationError = validateWorkRejectionReason(values.reason);
        if (validationError) {
            setFieldError(validationError);
            return;
        }

        setIsSubmitting(true);
        setFieldError(null);
        setSubmitError(null);
        try {
            await onSubmit(values.reason.trim());
            reset();
            onSubmitted();
        } catch (cause: unknown) {
            setSubmitError(
                cause instanceof Error
                    ? cause.message
                    : 'Failed to reject work',
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return {
        values,
        setField,
        fieldError,
        submitError,
        isSubmitting,
        reset,
        handleSubmit,
    };
}
