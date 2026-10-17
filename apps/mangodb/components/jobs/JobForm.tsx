'use client';

import { useState, useEffect } from 'react';
import CategorySelector from './CategorySelector';
import { createJob, updateJob } from '@/lib/jobs';
import { toFormErrors } from '@/lib/validation/formErrors';
import FieldError from '@/components/ui/FieldError';
import { useRouter } from 'next/navigation';
import type {
    Category,
    CreateJobRequest,
    Job,
    UpdateJobRequest,
} from '@mangodb/shared';
import { listCategories } from '@/lib/categories';
import { describeError } from '@/lib/api';

import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';

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

const JOB_FIELDS = {
    listingTitle: 'title',
    listingDesc: 'description',
    minBudget: 'minBudget',
    maxBudget: 'maxBudget',
    locationPref: 'location',
    duration: 'duration',
    deadline: 'deadline',
    categoryIds: 'categoryIds',
} as const;

type JobErrors = Partial<
    Record<
        | 'title'
        | 'description'
        | 'minBudget'
        | 'maxBudget'
        | 'location'
        | 'duration'
        | 'deadline'
        | 'categoryIds',
        string
    >
>;

type JobFormProps = {
    jobId?: number;
    initialJob?: Job;
};

export default function JobForm({ jobId, initialJob }: JobFormProps) {
    const [listingTitle, setListingTitle] = useState(
        initialJob?.listingTitle ?? '',
    );
    const [listingDesc, setListingDesc] = useState(
        initialJob?.listingDesc ?? '',
    );
    const [minBudget, setMinBudget] = useState(
        initialJob?.minBudget != null ? String(initialJob.minBudget) : '',
    );
    const [maxBudget, setMaxBudget] = useState(
        initialJob?.maxBudget != null ? String(initialJob.maxBudget) : '',
    );
    const [locationPref, setLocationPref] = useState(
        initialJob?.locationPref ?? '',
    );
    const [duration, setDuration] = useState(initialJob?.duration ?? '');
    const [deadline, setDeadline] = useState(
        initialJob?.deadline?.slice(0, 10) ?? '',
    );

    const [categories, setCategories] = useState<Category[]>([]);
    const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
    const [categoriesError, setCategoriesError] = useState<string | null>(null);
    const [categoryIds, setCategoryIds] = useState<number[]>(
        initialJob?.categoryIds ?? [],
    );

    const [errors, setErrors] = useState<JobErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();

    useEffect(() => {
        async function fetchCategories() {
            try {
                setIsCategoriesLoading(true);
                setCategoriesError(null);

                const data = await listCategories();
                setCategories(data);
            } catch (error: unknown) {
                setCategoriesError(describeError(error));
            } finally {
                setIsCategoriesLoading(false);
            }
        }

        void fetchCategories();
    }, []);

    const clearError = (field: keyof JobErrors) => {
        setErrors((prev) => ({
            ...prev,
            [field]: undefined,
        }));
    };

    const validateForm = (): boolean => {
        const newErrors: JobErrors = {};

        const titleError = validateListingTitle(listingTitle);
        if (titleError) newErrors.title = titleError;

        const descriptionError = validateListingDesc(listingDesc);
        if (descriptionError) newErrors.description = descriptionError;

        const categoryError = validateCategoryIds(categoryIds);
        if (categoryError) newErrors.categoryIds = categoryError;

        const budgetErrors = validateBudgets(minBudget, maxBudget, {
            maxRequired: true,
        });

        if (budgetErrors.minBudget) {
            newErrors.minBudget = budgetErrors.minBudget;
        }

        if (budgetErrors.maxBudget) {
            newErrors.maxBudget = budgetErrors.maxBudget;
        }

        const durationError = validateJobDuration(duration);
        if (durationError) newErrors.duration = durationError;

        const locationError = validateJobLocation(locationPref);
        if (locationError) newErrors.location = locationError;

        const initialDeadline = initialJob?.deadline?.slice(0, 10);

        if (!initialJob || deadline !== initialDeadline) {
            const deadlineError = validateJobDeadline(deadline);

            if (deadlineError) {
                newErrors.deadline = deadlineError;
            }
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError(null);

        if (!validateForm()) return;

        const parsedMinBudget =
            minBudget.trim() === '' ? null : Number(minBudget);

        const parsedMaxBudget = Number(maxBudget);

        if (
            !maxBudget.trim() ||
            !Number.isFinite(parsedMaxBudget) ||
            parsedMaxBudget <= 0
        ) {
            setErrors((prev) => ({
                ...prev,
                maxBudget: 'Maximum budget must be a positive number.',
            }));
            return;
        }

        const normalizedTitle = listingTitle.trim();
        const normalizedDescription = listingDesc.trim();
        const normalizedLocation = locationPref.trim() || null;
        const normalizedDuration = duration.trim() || null;
        const normalizedDeadline = deadline.trim() || null;

        try {
            setIsLoading(true);

            if (jobId !== undefined && initialJob) {
                // Edit mode: send only fields that changed.
                const data: UpdateJobRequest = {};

                if (normalizedTitle !== initialJob.listingTitle) {
                    data.listingTitle = normalizedTitle;
                }

                if (normalizedDescription !== initialJob.listingDesc) {
                    data.listingDesc = normalizedDescription;
                }

                if (parsedMinBudget !== initialJob.minBudget) {
                    data.minBudget = parsedMinBudget;
                }

                if (parsedMaxBudget !== initialJob.maxBudget) {
                    data.maxBudget = parsedMaxBudget;
                }

                if (normalizedLocation !== initialJob.locationPref) {
                    data.locationPref = normalizedLocation;
                }

                if (normalizedDuration !== initialJob.duration) {
                    data.duration = normalizedDuration;
                }

                if (normalizedDeadline !== initialJob.deadline) {
                    data.deadline = normalizedDeadline;
                }

                const sameCategories =
                    categoryIds.length === initialJob.categoryIds.length &&
                    categoryIds.every((id) =>
                        initialJob.categoryIds.includes(id),
                    );

                if (!sameCategories) {
                    data.categoryIds = categoryIds;
                }

                if (Object.keys(data).length === 0) {
                    setFormError('No changes to save.');
                    return;
                }

                await updateJob(jobId, data);
                router.push('/jobs/mine?success=updated');
            } else {
                // Create mode: preserve the existing behavior.
                const data: CreateJobRequest = {
                    listingTitle: normalizedTitle,
                    listingDesc: normalizedDescription,
                    minBudget: parsedMinBudget,
                    maxBudget: parsedMaxBudget,
                    locationPref: normalizedLocation,
                    duration: normalizedDuration,
                    deadline: normalizedDeadline,
                    categoryIds,
                };

                await createJob(data);
                router.push('/jobs/mine?success=posted');
            }
        } catch (cause: unknown) {
            const { fields, message } = toFormErrors(cause, JOB_FIELDS);
            setErrors(fields);
            setFormError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex w-[67.1875vw] flex-col gap-[2vh]"
            noValidate
        >
            <div className="type-md relative flex min-h-[80vh] w-[55.16vw] flex-col gap-[2vh] rounded-popup bg-surface-white px-[2.6vw] pt-[3.2vh] pb-[6vh] shadow-card">
                <Input
                    id="job-title"
                    label="Title*"
                    value={listingTitle}
                    onChange={(value) => {
                        setListingTitle(value);
                        clearError('title');
                    }}
                    error={errors.title}
                    placeholder="Ex: Build a responsive website"
                    required
                />

                {/* Description */}
                <Textarea
                    id="job-description"
                    label="Description*"
                    value={listingDesc}
                    onChange={(value) => {
                        setListingDesc(value);
                        clearError('description');
                    }}
                    error={errors.description}
                    placeholder="Describe the job requirements and expected work..."
                    required
                />

                {/* Categories */}
                <div className="flex flex-col gap-[0.46vh]">
                    <label className="block">Job Category</label>

                    {isCategoriesLoading ? (
                        <p className="type-sm">Loading categories...</p>
                    ) : categoriesError ? (
                        <p className="type-sm text-danger" role="alert">
                            {categoriesError}
                        </p>
                    ) : (
                        <CategorySelector
                            categories={categories}
                            selectedIds={categoryIds}
                            onChange={(ids) => {
                                setCategoryIds(ids);
                                clearError('categoryIds');
                            }}
                            error={errors.categoryIds}
                        />
                    )}
                </div>

                {/* Budget */}
                <div className="flex w-full gap-[1vw]">
                    {/* Minimum */}
                    <Input
                        id="min-budget"
                        label="Min Budget"
                        type="text"
                        inputMode="numeric"
                        value={minBudget}
                        onChange={setMinBudget}
                        error={errors.minBudget}
                        placeholder="Ex: 20000"
                    />

                    {/* Maximum */}
                    <Input
                        id="max-budget"
                        label="Max Budget*"
                        type="text"
                        inputMode="numeric"
                        value={maxBudget}
                        onChange={setMaxBudget}
                        error={errors.maxBudget}
                        placeholder="Ex: 50000"
                    />
                </div>

                {/* Location */}
                <Input
                    id="location"
                    label="Location"
                    type="text"
                    value={locationPref}
                    onChange={setLocationPref}
                    error={errors.location}
                    placeholder="Ex: Bangkok / Remote"
                />

                <div className="flex w-full gap-[1vw]">
                    {/* Deadline */}
                    <Input
                        id="deadline"
                        label="Deadline"
                        type="date"
                        value={deadline}
                        onChange={setDeadline}
                        error={errors.deadline}
                    />

                    {/* Duration */}
                    <Input
                        id="duration"
                        label="Duration"
                        type="text"
                        value={duration}
                        onChange={setDuration}
                        error={errors.duration}
                        placeholder="Ex: 3 months"
                    />
                </div>
            </div>

            {/* Form error */}
            <FieldError message={formError} />

            <div className="mt-auto flex w-full shrink-0 items-center justify-end gap-3 pt-4">
                <Button
                    type="button"
                    // variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                    className="h-[4.07vh] w-[8.5vw] rounded-button bg-scrollbar type-sm !font-[500] text-surface transition-colors hover:bg-fill-muted disabled:opacity-50"
                >
                    Cancel
                </Button>

                <Button
                    type="submit"
                    isLoading={isLoading}
                    loadingLabel={
                        jobId !== undefined ? 'Saving...' : 'Posting...'
                    }
                    className="h-[4.07vh] w-[8.5vw] rounded-button bg-brand type-sm !font-[500] text-surface transition-colors hover:bg-brand-light disabled:opacity-50"
                >
                    {jobId !== undefined ? 'Save Changes' : 'Post'}
                </Button>
            </div>
        </form>
    );
}
