'use client';

import { useState } from 'react';
import { ApiRequestError } from '@/lib/api';
import { updateMyProfile } from '@/lib/companies';
import { validateProfile, type ProfileErrors } from '@/lib/validation';
import type { ProfileFormData } from '@/components/forms/CompanyProfileForm';
import { toUpdateRequest } from '@/components/forms/CompanyProfileForm';
import type { StatusMessageData } from '@/components/ui/StatusMessage';

export function toFormErrors(
    details: ApiRequestError['details'],
): ProfileErrors {
    const errors: ProfileErrors = {};

    for (const detail of details) {
        const field = detail.field.split('.')[0] as keyof ProfileFormData;
        if (field && !errors[field]) {
            errors[field] = detail.message;
        }
    }

    return errors;
}

type UseProfileFormOptions = {
    initialData: ProfileFormData;
    isProvider?: boolean;
    onSaveSuccess?: (saved: ProfileFormData) => void;
};

export function useProfileForm({
    initialData,
    isProvider,
    onSaveSuccess,
}: UseProfileFormOptions) {
    const [data, setData] = useState<ProfileFormData>(initialData);
    const [lastInitial, setLastInitial] =
        useState<ProfileFormData>(initialData);
    const [errors, setErrors] = useState<ProfileErrors>({});
    const [status, setStatus] = useState<StatusMessageData>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Sync if initialData changes externally (e.g. after fresh profile fetch)
    if (lastInitial !== initialData) {
        setLastInitial(initialData);
        setData(initialData);
    }

    const setField = <K extends keyof ProfileFormData>(
        key: K,
        value: ProfileFormData[K],
    ) => {
        setData((current) => ({ ...current, [key]: value }));
        if (errors[key]) {
            setErrors((current) => {
                const next = { ...current };
                delete next[key];
                return next;
            });
        }
    };

    const clearFieldError = (key: keyof ProfileFormData) => {
        if (errors[key]) {
            setErrors((current) => {
                const next = { ...current };
                delete next[key];
                return next;
            });
        }
    };

    const clearStatus = () => setStatus(null);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        setStatus(null);

        // 1. Client-side field and format validation
        const validationErrors = validateProfile(data, isProvider);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setStatus({
                type: 'error',
                message: 'Please fix the errors before saving.',
            });
            return false;
        }

        // 2. Submit to API
        setErrors({});
        setIsSaving(true);

        try {
            const updated = await updateMyProfile(toUpdateRequest(data));
            const savedWithPhoto: ProfileFormData = {
                ...updated,
                photoUrl: data.photoUrl,
            };
            setData(savedWithPhoto);
            setStatus({
                type: 'success',
                message: 'Profile saved successfully.',
            });
            onSaveSuccess?.(savedWithPhoto);
            return true;
        } catch (err: unknown) {
            if (!(err instanceof ApiRequestError)) {
                setStatus({
                    type: 'error',
                    message:
                        'Could not reach the API. Is it running on port 4000?',
                });
                return false;
            }

            const fieldErrors = toFormErrors(err.details);
            setErrors(fieldErrors);
            setStatus({
                type: 'error',
                message:
                    Object.keys(fieldErrors).length > 0
                        ? 'Some fields need fixing.'
                        : err.message,
            });
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    return {
        data,
        setData,
        setField,
        errors,
        setErrors,
        clearFieldError,
        status,
        setStatus,
        clearStatus,
        isSaving,
        handleSubmit,
    };
}
