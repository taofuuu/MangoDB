'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import CategorySelector from '../ui/CategorySelector';
import { createJobPosting, type CreateJobPosting } from '@/lib/job';
import { toFormErrors } from '@/lib/validation';
import FieldError from '@/components/ui/FieldError';
import { useRouter } from 'next/navigation';

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
    Record<(typeof JOB_FIELDS)[keyof typeof JOB_FIELDS], string>
>;

type Category = {
    catId: number;
    catName: string;
};

export default function JobForm() {
    const [listingTitle, setListingTitle] = useState('');
    const [listingDesc, setListingDesc] = useState('');
    const [minBudget, setMinBudget] = useState('');
    const [maxBudget, setMaxBudget] = useState('');
    const [locationPref, setLocationPref] = useState('');
    const [duration, setDuration] = useState('');
    const [deadline, setDeadline] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryIds, setCategoryIds] = useState<number[]>([]);

    const [errors, setErrors] = useState<JobErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();

    useEffect(() => {
        async function fetchCategories() {
            try {
                const result = await apiFetch<Category[]>('/categories');
                setCategories(result);
            } catch (error) {
                console.error('Failed to fetch categories:', error);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setErrors({});
        setFormError(null);

        const parsedMinBudget =
            minBudget.trim() === '' ? null : Number(minBudget);

        const parsedMaxBudget =
            maxBudget.trim() === '' ? null : Number(maxBudget);

        // Only check that non-empty values are valid numbers.
        // Let the backend schema validate integer, positive,
        // non-negative, and minBudget <= maxBudget rules.
        const minBudgetInvalid =
            minBudget.trim() !== '' && !Number.isFinite(parsedMinBudget);

        const maxBudgetInvalid =
            maxBudget.trim() !== '' && !Number.isFinite(parsedMaxBudget);

        if (minBudgetInvalid || maxBudgetInvalid) {
            const budgetErrors: Partial<
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
            > = {};

            if (minBudgetInvalid) {
                budgetErrors.minBudget =
                    'Minimum budget must be a valid number.';
            }

            if (maxBudgetInvalid) {
                budgetErrors.maxBudget =
                    'Maximum budget must be a valid number.';
            }

            setErrors(budgetErrors);
            return;
        }
        try {
            setIsLoading(true);

            const data: CreateJobPosting = {
                listingTitle: listingTitle.trim(),
                listingDesc: listingDesc.trim(),
                minBudget: parsedMinBudget,
                maxBudget: parsedMaxBudget,
                locationPref:
                    locationPref.trim() === '' ? null : locationPref.trim(),
                duration: duration.trim() === '' ? null : duration.trim(),
                deadline: deadline.trim() === '' ? null : deadline,
                categoryIds,
            };

            await createJobPosting(data);
            router.push('/job/view-own?success=posted');
        } catch (cause) {
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
        >
            <div className="type-md relative flex min-h-[80vh] w-[55.16vw] flex-col gap-[1.2vh] rounded-popup bg-white px-[2.6vw] pt-[3.2vh] pb-[6vh] shadow-[2px_2px_10px_2px_#CCCCCC]">
                <div className="flex flex-col gap-[0.46vh]">
                    <label className="block">Title*</label>

                    <input
                        type="text"
                        value={listingTitle}
                        onChange={(e) => {
                            setListingTitle(e.target.value);
                            clearError('title');
                        }}
                        className="h-[4.07vh] w-full rounded-input border border-brand bg-surface-white/80 px-1.5 type-sm text-ink placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-brand"
                        placeholder="Ex: Build a responsive website"
                        required
                    />

                    <FieldError message={errors.title} />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-[0.46vh]">
                    <label className="block">Description*</label>

                    <textarea
                        value={listingDesc}
                        onChange={(e) => {
                            setListingDesc(e.target.value);
                            clearError('description');
                        }}
                        className="h-[15.09vh] w-full resize-none rounded-input border border-brand bg-surface-white/80 p-2 type-sm text-ink placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-brand"
                        placeholder="Describe the job requirements and expected work..."
                        required
                    />

                    <FieldError message={errors.description} />
                </div>

                {/* Categories */}
                <div className="flex flex-col gap-[0.46vh]">
                    <label className="block">Job Category</label>

                    <CategorySelector
                        categories={categories}
                        selectedIds={categoryIds}
                        onChange={(ids) => {
                            setCategoryIds(ids);
                            clearError('categoryIds');
                        }}
                        {...(errors.categoryIds !== undefined
                            ? { error: errors.categoryIds }
                            : {})}
                    />
                </div>

                {/* Budget */}
                <div className="flex w-full gap-[1vw]">
                    {/* Minimum */}
                    <div className="flex min-w-0 flex-1 flex-col gap-[0.46vh]">
                        <label className="block">Min Budget</label>

                        <input
                            type="text"
                            inputMode="numeric"
                            value={minBudget}
                            onChange={(e) => {
                                setMinBudget(e.target.value);
                            }}
                            className="h-[4.07vh] w-full box-border rounded-input border border-brand bg-surface-white/80 px-1.5 type-sm text-ink placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-brand"
                            placeholder="Ex: 20000"
                        />

                        <FieldError message={errors.minBudget} />
                    </div>

                    {/* Maximum */}
                    <div className="flex min-w-0 flex-1 flex-col gap-[0.46vh]">
                        <label className="block">Max Budget</label>

                        <input
                            type="text"
                            inputMode="numeric"
                            value={maxBudget}
                            onChange={(e) => setMaxBudget(e.target.value)}
                            className="h-[4.07vh] w-full box-border rounded-input border border-brand bg-surface-white/80 px-1.5 type-sm text-ink placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-brand"
                            placeholder="Ex: 50000"
                        />

                        <FieldError message={errors.maxBudget} />
                    </div>
                </div>

                {/* Location */}
                <div className="flex flex-col gap-[0.46vh]">
                    <label className="block">Location</label>

                    <input
                        type="text"
                        value={locationPref}
                        onChange={(e) => {
                            setLocationPref(e.target.value);
                            clearError('location');
                        }}
                        className="h-[4.07vh] w-full rounded-input border border-brand bg-surface-white/80 px-1.5 type-sm text-ink placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-brand"
                        placeholder="Ex: Bangkok / Remote"
                    />

                    <FieldError message={errors.location} />
                </div>

                {/* Budget */}
                <div className="flex w-full gap-[1vw]">
                    {/* Deadline */}
                    <div className="flex min-w-0 flex-1 flex-col gap-[0.46vh]">
                        <label className="block">Deadline</label>

                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => {
                                setDeadline(e.target.value);
                                clearError('deadline');
                            }}
                            className="h-[4.07vh] w-full rounded-input border border-brand bg-surface-white/80 px-1.5 type-sm text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                        />

                        <FieldError message={errors.deadline} />
                    </div>

                    {/* Duration */}
                    <div className="flex min-w-0 flex-1 flex-col gap-[0.46vh]">
                        <label className="block">Duration</label>

                        <input
                            type="text"
                            value={duration}
                            onChange={(e) => {
                                setDuration(e.target.value);
                                clearError('duration');
                            }}
                            className="h-[4.07vh] w-full rounded-input border border-brand bg-surface-white/80 px-1.5 type-sm text-ink placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-brand"
                            placeholder="Ex: 3 months"
                        />

                        <FieldError message={errors.duration} />
                    </div>
                </div>
            </div>

            {/* Form error */}
            <FieldError message={formError} />

            <div className="mt-auto flex w-full shrink-0 items-center justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    disabled={isLoading}
                    className="h-[4.07vh] w-[8.5vw] rounded-button bg-scrollbar type-sm !font-[500] text-surface transition-colors hover:bg-fill-muted disabled:opacity-50"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="h-[4.07vh] w-[8.5vw] rounded-button bg-brand type-sm !font-[500] text-surface transition-colors hover:bg-brand-light disabled:opacity-50"
                >
                    {isLoading ? 'Posting...' : 'Post'}
                </button>
            </div>
        </form>
    );
}
