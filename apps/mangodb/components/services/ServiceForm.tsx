'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import FieldError from '@/components/ui/FieldError';
import ServicePortfolios from './ServicePortfolios';
import TechStackInput from './TechStackInput';
import { useServiceForm } from './useServiceForm';
import { useCategories } from '@/lib/useCategories';
import SuccessModal from '@/components/ui/SuccessModal';
import UnsavedChangesModal from './UnsavedChangesModal';
import PageGate from '@/components/auth/PageGate';
import { NOT_SIGNED_IN } from '@/lib/api';
import { useMyCompany } from '@/lib/useMyCompany';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';

type ServiceFormProps =
    { mode: 'create' } | { mode: 'edit'; serviceId: number };

// Only draws the form and its modals. Loading, checks and saving live in
// useServiceForm.
export default function ServiceForm(props: ServiceFormProps) {
    const router = useRouter();
    const serviceId = props.mode === 'edit' ? props.serviceId : null;

    // ── ALL HOOKS MUST BE DECLARED AT THE TOP LEVEL BEFORE ANY RETURNS ──
    const me = useMyCompany('provider');
    const {
        isEditing,
        isLoaded,
        loadError,
        values,
        setField,
        setFieldError,
        errors,
        formError,
        isSubmitting,
        hasUnsavedChanges,
        savedTitle,
        createdServiceId,
        pendingPortfolios,
        savedPortfolios,
        addPortfolio,
        removePortfolio,
        updateSavedPortfolio,
        handleSubmit,
        handleDelete,
    } = useServiceForm(
        serviceId,
        me.status === 'ready' ? me.company.companyId : null,
    );
    // The catalog (ADR 0002).
    const {
        categories,
        loading: categoriesLoading,
        error: categoriesError,
    } = useCategories();
    // At most one modal is open at a time.
    const [openModal, setOpenModal] = useState<
        'success' | 'leave' | 'delete' | null
    >(null);

    const handleSave = async (e: FormEvent<HTMLFormElement>) => {
        if (await handleSubmit(e)) setOpenModal('success');
    };

    const handleSuccessConfirm = () => {
        setOpenModal(null);
        if (isEditing) {
            router.back();
            return;
        }
        router.push('/');
    };

    const handleCancel = () => {
        if (hasUnsavedChanges) {
            setOpenModal('leave');
            return;
        }
        router.back();
    };

    const toggleCategory = (categoryId: number) => {
        const ids = values.categoryIds;
        setField(
            'categoryIds',
            ids.includes(categoryId)
                ? ids.filter((id) => id !== categoryId)
                : [...ids, categoryId],
        );
    };

    // ── EARLY RETURNS PLACED AFTER ALL HOOKS ──
    if (me.status !== 'ready') {
        return (
            <PageGate
                state={me}
                roleMessage={
                    <p>
                        You need a <strong>Provider</strong> account to create
                        or manage service listings.
                    </p>
                }
            />
        );
    }

    if (loadError === NOT_SIGNED_IN) {
        return <div className="min-h-screen bg-surface" />;
    }

    if (loadError) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-surface px-6">
                <div className="max-w-lg rounded-popup border border-line bg-surface-white p-8 text-center shadow-sm">
                    <h1 className="type-lg text-ink">
                        {isEditing
                            ? 'Unable to edit service'
                            : 'Unable to add service'}
                    </h1>
                    <p role="alert" className="mt-3 type-sm text-ink-soft">
                        {loadError}
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => router.back()}
                        className="mt-6 px-5 py-2 type-sm font-semibold"
                    >
                        Go back
                    </Button>
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return <div className="min-h-screen bg-surface" />;
    }

    return (
        <div className="min-h-screen bg-surface py-12 px-6 flex justify-center text-ink">
            <div className="w-full max-w-[1100px]">
                <h1 className="type-hd mb-4">
                    {isEditing ? 'Edit Service' : 'Add My Service'}
                </h1>
                <hr className="border-brand/40 mb-4" />
                <p className="type-sm text-ink-soft font-medium mb-6">
                    * Indicates required
                </p>

                <form onSubmit={handleSave} noValidate>
                    <div className="flex flex-col md:flex-row gap-6 items-stretch">
                        {/* LEFT COLUMN */}
                        <div className="flex-1 bg-surface-white rounded-2xl p-6 shadow-sm border border-line">
                            <div className="space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="block type-sm font-semibold mb-1 text-ink">
                                        Title*
                                    </label>
                                    <input
                                        type="text"
                                        value={values.title}
                                        onChange={(e) =>
                                            setField('title', e.target.value)
                                        }
                                        placeholder="Ex. Web Development with React"
                                        className={`w-full rounded-input border px-3 py-2 type-sm placeholder:text-ink-placeholder focus:outline-none ${
                                            errors.title
                                                ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger'
                                                : 'border-line focus:border-brand focus:ring-1 focus:ring-brand'
                                        }`}
                                    />
                                    <FieldError message={errors.title} />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block type-sm font-semibold mb-1 text-ink">
                                        Description*
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={values.description}
                                        onChange={(e) =>
                                            setField(
                                                'description',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Ex. Full-stack development services..."
                                        className={`w-full resize-none rounded-input border p-3 type-sm placeholder:text-ink-placeholder focus:outline-none ${
                                            errors.description
                                                ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger'
                                                : 'border-line focus:border-brand focus:ring-1 focus:ring-brand'
                                        }`}
                                    />
                                    <FieldError message={errors.description} />
                                </div>

                                {/* Service Category */}
                                <div>
                                    <label className="block type-sm font-semibold mb-2 text-ink">
                                        Service Category*
                                    </label>
                                    {categoriesError && (
                                        <FieldError message={categoriesError} />
                                    )}
                                    {categoriesLoading && (
                                        <p className="type-sm text-ink-placeholder">
                                            Loading categories...
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map((cat) => {
                                            const isSelected =
                                                values.categoryIds.includes(
                                                    cat.categoryId,
                                                );
                                            return (
                                                <button
                                                    type="button"
                                                    key={cat.categoryId}
                                                    onClick={() =>
                                                        toggleCategory(
                                                            cat.categoryId,
                                                        )
                                                    }
                                                    className={`px-3.5 py-1.5 rounded-status type-xs font-medium transition-colors border ${
                                                        isSelected
                                                            ? 'bg-brand text-surface-white border-brand'
                                                            : 'bg-brand-tint text-ink-soft border-transparent hover:bg-brand-mist'
                                                    }`}
                                                >
                                                    {cat.categoryName}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <FieldError message={errors.categoryIds} />
                                </div>

                                <TechStackInput
                                    value={values.techStack}
                                    onChange={(techStack) =>
                                        setField('techStack', techStack)
                                    }
                                    error={errors.techStack}
                                    onError={(message) =>
                                        setFieldError('techStack', message)
                                    }
                                />

                                {/* Budget */}
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block type-sm font-semibold mb-1 text-ink">
                                            Min Budget
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={values.minBudget}
                                            onChange={(e) =>
                                                setField(
                                                    'minBudget',
                                                    e.target.value,
                                                )
                                            }
                                            className={`w-full rounded-input border px-3 py-2 type-sm focus:outline-none ${
                                                errors.minBudget
                                                    ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger'
                                                    : 'border-line focus:border-brand focus:ring-1 focus:ring-brand'
                                            }`}
                                        />
                                        <FieldError
                                            message={errors.minBudget}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block type-sm font-semibold mb-1 text-ink">
                                            Max Budget
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={values.maxBudget}
                                            onChange={(e) =>
                                                setField(
                                                    'maxBudget',
                                                    e.target.value,
                                                )
                                            }
                                            className={`w-full rounded-input border px-3 py-2 type-sm focus:outline-none ${
                                                errors.maxBudget
                                                    ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger'
                                                    : 'border-line focus:border-brand focus:ring-1 focus:ring-brand'
                                            }`}
                                        />
                                        <FieldError
                                            message={errors.maxBudget}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <ServicePortfolios
                            saved={savedPortfolios}
                            onSavedChange={updateSavedPortfolio}
                            pending={pendingPortfolios}
                            onAddPending={addPortfolio}
                            onRemovePending={removePortfolio}
                        />
                    </div>

                    {formError && (
                        <p className="mt-4 type-sm text-danger font-medium">
                            {formError}
                        </p>
                    )}

                    <div className="mt-8 flex items-center justify-end gap-3">
                        {isEditing && (
                            <Button
                                type="button"
                                variant="danger"
                                onClick={() => setOpenModal('delete')}
                                disabled={isSubmitting}
                                className="mr-auto px-5 py-2 type-sm font-semibold disabled:opacity-60"
                            >
                                Delete Service
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="muted"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            className="px-5 py-2 type-sm font-semibold disabled:opacity-60"
                        >
                            Cancel
                        </Button>
                        <button
                            type="submit"
                            disabled={
                                isSubmitting ||
                                (isEditing && !hasUnsavedChanges)
                            }
                            className="px-5 py-2 rounded-button bg-brand text-surface-white type-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSubmitting
                                ? 'Saving…'
                                : createdServiceId
                                  ? 'Retry Portfolio Upload'
                                  : isEditing
                                    ? 'Save Changes'
                                    : 'Add Service'}
                        </button>
                    </div>
                </form>
            </div>

            <SuccessModal
                isOpen={openModal === 'success'}
                onClose={handleSuccessConfirm}
                title={
                    isEditing
                        ? 'Service updated successfully'
                        : 'Service added successfully'
                }
            />

            <ConfirmModal
                isOpen={openModal === 'delete'}
                onClose={() => setOpenModal(null)}
                onConfirm={handleDelete}
                title="Delete this service listing?"
                description={`${savedTitle || 'This service'} will be removed and Receivers will no longer see it in search results. This can't be undone.`}
                confirmLabel="Delete listing"
            />

            <UnsavedChangesModal
                isOpen={openModal === 'leave'}
                onKeepEditing={() => setOpenModal(null)}
                onDiscard={() => {
                    setOpenModal(null);
                    router.back();
                }}
            />
        </div>
    );
}
