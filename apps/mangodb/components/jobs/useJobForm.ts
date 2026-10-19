'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateJobRequest, Job, UpdateJobRequest } from '@mangodb/shared';
import { createJob, updateJob } from '@/lib/jobs';
import { type FieldErrors, toFormErrors } from '@/lib/validation/formErrors';
import {
    validateJobDeadline,
    validateJobDuration,
    validateJobLocation,
} from '@/lib/validation/job';
import {
    validateBudgets,
    validateCategoryIds,
    validateListingDesc,
    validateListingTitle,
} from '@/lib/validation/listing';

// What the inputs hold. Budgets stay text so a half-typed number is not
// rewritten while the user types.
type JobValues = {
    title: string;
    description: string;
    categoryIds: number[];
    minBudget: string;
    maxBudget: string;
    location: string;
    deadline: string;
    duration: string;
};

type JobErrors = FieldErrors<keyof JobValues>;

// API field name → the form's name for it, for errors the API sends back.
const JOB_FIELDS = {
    listingTitle: 'title',
    listingDesc: 'description',
    categoryIds: 'categoryIds',
    minBudget: 'minBudget',
    maxBudget: 'maxBudget',
    locationPref: 'location',
    deadline: 'deadline',
    duration: 'duration',
} as const;

// Blank for a new job, or the job's own values for an edit.
function toValues(job: Job | undefined): JobValues {
    return {
        title: job?.listingTitle ?? '',
        description: job?.listingDesc ?? '',
        categoryIds: job?.categoryIds ?? [],
        minBudget: job?.minBudget != null ? String(job.minBudget) : '',
        maxBudget: job?.maxBudget != null ? String(job.maxBudget) : '',
        location: job?.locationPref ?? '',
        deadline: job?.deadline?.slice(0, 10) ?? '',
        duration: job?.duration ?? '',
    };
}

// The rules the API also checks, so most mistakes show before a request.
function validate(values: JobValues, job: Job | undefined): JobErrors {
    const errors: JobErrors = validateBudgets(
        values.minBudget,
        values.maxBudget,
        { maxRequired: true },
    );

    const title = validateListingTitle(values.title);
    if (title) errors.title = title;

    const description = validateListingDesc(values.description);
    if (description) errors.description = description;

    const categoryIds = validateCategoryIds(values.categoryIds);
    if (categoryIds) errors.categoryIds = categoryIds;

    const location = validateJobLocation(values.location);
    if (location) errors.location = location;

    const duration = validateJobDuration(values.duration);
    if (duration) errors.duration = duration;

    // An edit may keep a deadline that has since passed.
    if (!job || values.deadline !== toValues(job).deadline) {
        const deadline = validateJobDeadline(values.deadline);
        if (deadline) errors.deadline = deadline;
    }

    return errors;
}

// The body POST /jobs takes: trimmed text, numbers, and null for a blank.
function toRequest(values: JobValues): CreateJobRequest {
    return {
        listingTitle: values.title.trim(),
        listingDesc: values.description.trim(),
        categoryIds: values.categoryIds,
        minBudget:
            values.minBudget.trim() === '' ? null : Number(values.minBudget),
        maxBudget: Number(values.maxBudget),
        locationPref: values.location.trim() || null,
        deadline: values.deadline.trim() || null,
        duration: values.duration.trim() || null,
    };
}

// An edit sends only the fields that differ from the job it opened with.
function changedFields(values: JobValues, job: Job): UpdateJobRequest {
    const next = toRequest(values);
    const changes: UpdateJobRequest = {};

    if (next.listingTitle !== job.listingTitle) {
        changes.listingTitle = next.listingTitle;
    }
    if (next.listingDesc !== job.listingDesc) {
        changes.listingDesc = next.listingDesc;
    }
    if (next.minBudget !== job.minBudget) changes.minBudget = next.minBudget;
    if (next.maxBudget !== job.maxBudget) changes.maxBudget = next.maxBudget;
    if (next.locationPref !== job.locationPref) {
        changes.locationPref = next.locationPref;
    }
    if (next.deadline !== job.deadline) changes.deadline = next.deadline;
    if (next.duration !== job.duration) changes.duration = next.duration;

    const sameCategories =
        values.categoryIds.length === job.categoryIds.length &&
        values.categoryIds.every((id) => job.categoryIds.includes(id));
    if (!sameCategories) changes.categoryIds = values.categoryIds;

    return changes;
}

// Everything JobForm does besides drawing: the values, their errors, and the
// save. Pass the job to edit, or nothing to post a new one.
export function useJobForm(initialJob?: Job) {
    const router = useRouter();
    const [values, setValues] = useState(() => toValues(initialJob));
    const [errors, setErrors] = useState<JobErrors>({});
    // A save error that belongs to no one field.
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Changing a field also clears that field's error.
    function setField<Field extends keyof JobValues>(
        field: Field,
        value: JobValues[Field],
    ) {
        setValues((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFormError(null);

        const newErrors = validate(values, initialJob);
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        setIsSaving(true);
        try {
            if (initialJob) {
                const changes = changedFields(values, initialJob);
                if (Object.keys(changes).length === 0) {
                    setFormError('No changes to save.');
                    return;
                }
                await updateJob(initialJob.jobId, changes);
                router.push('/jobs/mine?success=updated');
            } else {
                await createJob(toRequest(values));
                router.push('/jobs/mine?success=posted');
            }
        } catch (cause: unknown) {
            const { fields, message } = toFormErrors(cause, JOB_FIELDS);
            setErrors(fields);
            setFormError(message);
        } finally {
            setIsSaving(false);
        }
    }

    return {
        values,
        setField,
        errors,
        formError,
        isSaving,
        isEditing: initialJob !== undefined,
        handleSubmit,
    };
}
