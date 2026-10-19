'use client';

import { useRouter } from 'next/navigation';
import type { Job } from '@mangodb/shared';
import { useCategories } from '@/lib/useCategories';
import CategorySelector from './CategorySelector';
import { useJobForm } from './useJobForm';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import FieldError from '@/components/ui/FieldError';

// Pass the job to edit it; leave it out to post a new one.
type JobFormProps = {
    initialJob?: Job;
};

// Only draws the form. The values, checks and save live in useJobForm.
export default function JobForm({ initialJob }: JobFormProps) {
    const router = useRouter();
    const {
        values,
        setField,
        errors,
        formError,
        isSaving,
        isEditing,
        handleSubmit,
    } = useJobForm(initialJob);
    const {
        categories,
        loading: isCategoriesLoading,
        error: categoriesError,
    } = useCategories();

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
                    value={values.title}
                    onChange={(value) => setField('title', value)}
                    error={errors.title}
                    placeholder="Ex: Build a responsive website"
                    required
                />

                {/* Description */}
                <Textarea
                    id="job-description"
                    label="Description*"
                    value={values.description}
                    onChange={(value) => setField('description', value)}
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
                            selectedIds={values.categoryIds}
                            onChange={(ids) => setField('categoryIds', ids)}
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
                        value={values.minBudget}
                        onChange={(value) => setField('minBudget', value)}
                        error={errors.minBudget}
                        placeholder="Ex: 20000"
                    />

                    {/* Maximum */}
                    <Input
                        id="max-budget"
                        label="Max Budget*"
                        type="text"
                        inputMode="numeric"
                        value={values.maxBudget}
                        onChange={(value) => setField('maxBudget', value)}
                        error={errors.maxBudget}
                        placeholder="Ex: 50000"
                    />
                </div>

                {/* Location */}
                <Input
                    id="location"
                    label="Location"
                    type="text"
                    value={values.location}
                    onChange={(value) => setField('location', value)}
                    error={errors.location}
                    placeholder="Ex: Bangkok / Remote"
                />

                <div className="flex w-full gap-[1vw]">
                    {/* Deadline */}
                    <Input
                        id="deadline"
                        label="Deadline"
                        type="date"
                        value={values.deadline}
                        onChange={(value) => setField('deadline', value)}
                        error={errors.deadline}
                    />

                    {/* Duration */}
                    <Input
                        id="duration"
                        label="Duration"
                        type="text"
                        value={values.duration}
                        onChange={(value) => setField('duration', value)}
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
                    disabled={isSaving}
                    className="h-[4.07vh] w-[8.5vw] rounded-button bg-scrollbar type-sm !font-[500] text-surface transition-colors hover:bg-fill-muted disabled:opacity-50"
                >
                    Cancel
                </Button>

                <Button
                    type="submit"
                    isLoading={isSaving}
                    loadingLabel={isEditing ? 'Saving...' : 'Posting...'}
                    className="h-[4.07vh] w-[8.5vw] rounded-button bg-brand type-sm !font-[500] text-surface transition-colors hover:bg-brand-light disabled:opacity-50"
                >
                    {isEditing ? 'Save Changes' : 'Post'}
                </Button>
            </div>
        </form>
    );
}
