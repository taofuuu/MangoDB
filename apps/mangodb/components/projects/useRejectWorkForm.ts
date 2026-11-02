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
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function setField<Field extends keyof RejectWorkValues>(
        field: Field,
        value: RejectWorkValues[Field],
    ) {
        setValues((previous) => ({ ...previous, [field]: value }));
        setError(null);
    }

    function reset() {
        setValues(EMPTY_VALUES);
        setError(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isSubmitting) return;

        const validationError = validateWorkRejectionReason(values.reason);
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmit(values.reason.trim());
            reset();
            onSubmitted();
        } catch (cause: unknown) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'Failed to reject work',
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return { values, setField, error, isSubmitting, reset, handleSubmit };
}
