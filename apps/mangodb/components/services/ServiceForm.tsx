'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
    Category,
    ServicePortfolio,
    UpdateServiceRequest,
} from '@mangodb/shared';
import FieldError from '@/components/ui/FieldError';
import { toFormErrors } from '@/lib/validation/formErrors';
import {
    SERVICE_FIELDS,
    validateServiceCategory,
    validateServiceTechStack,
} from '@/lib/validation/service';
import {
    validateBudgets,
    validateListingDesc,
    validateListingTitle,
} from '@/lib/validation/listing';
import {
    createService,
    deleteService,
    getService,
    updateService,
} from '@/lib/services';
import type { PendingPortfolio } from '@/components/portfolios/PortfolioForm';
import ServicePortfolios from './ServicePortfolios';
import TechStackInput from './TechStackInput';
import { listCategories } from '@/lib/categories';
import SuccessModal from '@/components/ui/SuccessModal';
import UnsavedChangesModal from './UnsavedChangesModal';
import PageGate from '@/components/auth/PageGate';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';
import { useMyCompany } from '@/lib/useMyCompany';
import { createPortfolio, listPortfolios } from '@/lib/portfolios';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { redirectToUnauthorized } from '@/lib/session';

type ServiceErrors = Partial<
    Record<
        | 'title'
        | 'description'
        | 'categoryIds'
        | 'techStack'
        | 'minBudget'
        | 'maxBudget',
        string
    >
>;

type ServiceFormProps =
    { mode: 'create' } | { mode: 'edit'; serviceId: number };

type ServiceSnapshot = {
    title: string;
    description: string;
    categoryIds: number[];
    techStack: string[];
    minBudget: string;
    maxBudget: string;
};

function normalizeService(snapshot: ServiceSnapshot): ServiceSnapshot {
    return {
        ...snapshot,
        title: snapshot.title.trim(),
        description: snapshot.description.trim(),
        categoryIds: [...snapshot.categoryIds].sort((a, b) => a - b),
        techStack: snapshot.techStack.map((item) => item.trim()),
        minBudget: snapshot.minBudget.trim(),
        maxBudget: snapshot.maxBudget.trim(),
    };
}

function serializeService(snapshot: ServiceSnapshot): string {
    return JSON.stringify(normalizeService(snapshot));
}

function changedServiceFields(
    current: ServiceSnapshot,
    initial: ServiceSnapshot,
): UpdateServiceRequest {
    const next = normalizeService(current);
    const previous = normalizeService(initial);
    const body: UpdateServiceRequest = {};

    if (next.title !== previous.title) body.listingTitle = next.title;
    if (next.description !== previous.description) {
        body.listingDesc = next.description;
    }
    if (
        JSON.stringify(next.categoryIds) !==
        JSON.stringify(previous.categoryIds)
    ) {
        body.categoryIds = next.categoryIds;
    }
    if (JSON.stringify(next.techStack) !== JSON.stringify(previous.techStack)) {
        body.techStack = next.techStack;
    }
    if (next.minBudget !== previous.minBudget) {
        body.minBudget = next.minBudget === '' ? null : Number(next.minBudget);
    }
    if (next.maxBudget !== previous.maxBudget) {
        body.maxBudget = next.maxBudget === '' ? null : Number(next.maxBudget);
    }

    return body;
}

export default function ServiceForm(props: ServiceFormProps) {
    const router = useRouter();
    const isEditMode = props.mode === 'edit';
    const serviceId = props.mode === 'edit' ? props.serviceId : null;

    // ── ALL HOOKS MUST BE DECLARED AT THE TOP LEVEL BEFORE ANY RETURNS ──
    const me = useMyCompany('provider');
    const companyId = me.status === 'ready' ? me.company.companyId : null;
    // Add has nothing to load; Edit is loaded once the service arrives.
    const [isLoaded, setIsLoaded] = useState(serviceId === null);
    // The catalog (ADR 0002). Null while it loads.
    const [categories, setCategories] = useState<Category[] | null>(null);
    const [categoriesError, setCategoriesError] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Form fields state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
        [],
    );
    const [selectedTechStack, setSelectedTechStack] = useState<string[]>([]);
    const [minBudget, setMinBudget] = useState('');
    const [maxBudget, setMaxBudget] = useState('');

    // Portfolios & Modals state
    const [portfolios, setPortfolios] = useState<PendingPortfolio[]>([]);
    const [savedPortfolios, setSavedPortfolios] = useState<ServicePortfolio[]>(
        [],
    );
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeletedModal, setShowDeletedModal] = useState(false);
    const [createdServiceId, setCreatedServiceId] = useState<number | null>(
        null,
    );
    const [initialValues, setInitialValues] = useState<ServiceSnapshot | null>(
        null,
    );

    // Errors & Loading state
    const [errors, setErrors] = useState<ServiceErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        listCategories()
            .then(setCategories)
            .catch((err: unknown) => setCategoriesError(describeError(err)));
    }, []);

    // ── EDIT: LOAD THE SERVICE ──
    // Waits for useMyCompany, since only the owning company may edit.
    useEffect(() => {
        if (serviceId === null || companyId === null) return;

        let cancelled = false;

        async function loadService(id: number) {
            try {
                const [service, existingPortfolios] = await Promise.all([
                    getService(id),
                    listPortfolios({ serviceId: id }),
                ]);

                if (cancelled) return;
                if (service.company.companyId !== companyId) {
                    setLoadError(
                        'You can only edit services owned by your company.',
                    );
                    return;
                }

                const loadedSnapshot: ServiceSnapshot = {
                    title: service.listingTitle,
                    description: service.listingDesc,
                    categoryIds: service.categoryIds,
                    techStack: service.techStack,
                    minBudget:
                        service.minBudget === null
                            ? ''
                            : String(service.minBudget),
                    maxBudget:
                        service.maxBudget === null
                            ? ''
                            : String(service.maxBudget),
                };

                setTitle(loadedSnapshot.title);
                setDescription(loadedSnapshot.description);
                setSelectedCategoryIds(loadedSnapshot.categoryIds);
                setSelectedTechStack(loadedSnapshot.techStack);
                setMinBudget(loadedSnapshot.minBudget);
                setMaxBudget(loadedSnapshot.maxBudget);
                setSavedPortfolios(existingPortfolios);
                setInitialValues(loadedSnapshot);
                setIsLoaded(true);
            } catch (err: unknown) {
                if (cancelled) return;
                if (isNotSignedIn(err)) {
                    setLoadError(NOT_SIGNED_IN);
                    redirectToUnauthorized();
                    return;
                }
                setLoadError(describeError(err));
            }
        }

        void loadService(serviceId);
        return () => {
            cancelled = true;
        };
    }, [serviceId, companyId]);

    const currentSnapshot = serializeService({
        title,
        description,
        categoryIds: selectedCategoryIds,
        techStack: selectedTechStack,
        minBudget,
        maxBudget,
    });
    const initialSnapshot = initialValues
        ? serializeService(initialValues)
        : null;
    const hasUnsavedChanges =
        isEditMode &&
        initialSnapshot !== null &&
        (currentSnapshot !== initialSnapshot || portfolios.length > 0);

    useEffect(() => {
        if (!hasUnsavedChanges) return;

        const warnBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', warnBeforeUnload);
        return () =>
            window.removeEventListener('beforeunload', warnBeforeUnload);
    }, [hasUnsavedChanges]);

    const clearError = (field: keyof ServiceErrors) =>
        setErrors((prev) => ({ ...prev, [field]: undefined }));

    const handleCategoryClick = (categoryId: number) => {
        clearError('categoryIds');
        setSelectedCategoryIds((prev) =>
            prev.includes(categoryId)
                ? prev.filter((id) => id !== categoryId)
                : [...prev, categoryId],
        );
    };

    const handleAddPortfolio = (item: PendingPortfolio) => {
        setPortfolios((prev) => [...prev, item]);
    };

    const handleRemovePortfolio = (id: string) => {
        setPortfolios((prev) => prev.filter((p) => p.id !== id));
    };

    const validateForm = (): boolean => {
        const newErrors: ServiceErrors = {};

        const titleErr = validateListingTitle(title);
        if (titleErr) newErrors.title = titleErr;

        const descErr = validateListingDesc(description);
        if (descErr) newErrors.description = descErr;

        const catErr = validateServiceCategory(selectedCategoryIds);
        if (catErr) newErrors.categoryIds = catErr;

        if (selectedTechStack.length === 0) {
            newErrors.techStack = 'At least one tech stack item is required.';
        } else {
            const techErr = validateServiceTechStack(selectedTechStack);
            if (techErr) newErrors.techStack = techErr;
        }

        const budgetErrs = validateBudgets(minBudget, maxBudget, {
            maxRequired: false,
        });
        if (budgetErrs.minBudget) newErrors.minBudget = budgetErrs.minBudget;
        if (budgetErrs.maxBudget) newErrors.maxBudget = budgetErrs.maxBudget;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!validateForm()) {
            return;
        }

        const min = minBudget.trim() !== '' ? Number(minBudget) : undefined;
        const max = maxBudget.trim() !== '' ? Number(maxBudget) : undefined;

        setIsSubmitting(true);
        let targetServiceId = serviceId ?? createdServiceId;

        try {
            const commonBody = {
                listingTitle: title.trim(),
                listingDesc: description.trim(),
                categoryIds: selectedCategoryIds,
                techStack: selectedTechStack,
            };

            if (isEditMode && targetServiceId && initialValues) {
                const changedFields = changedServiceFields(
                    {
                        title,
                        description,
                        categoryIds: selectedCategoryIds,
                        techStack: selectedTechStack,
                        minBudget,
                        maxBudget,
                    },
                    initialValues,
                );

                if (Object.keys(changedFields).length > 0) {
                    await updateService(targetServiceId, changedFields);
                }
            } else if (!targetServiceId) {
                const created = await createService({
                    ...commonBody,
                    ...(min !== undefined && { minBudget: min }),
                    ...(max !== undefined && { maxBudget: max }),
                });
                targetServiceId = created.serviceId;
                setCreatedServiceId(targetServiceId);
            }
        } catch (cause) {
            const { fields, message } = toFormErrors(cause, SERVICE_FIELDS);
            setErrors(fields as ServiceErrors);
            setFormError(message);
            setIsSubmitting(false);
            return;
        }

        if (!targetServiceId) {
            setFormError('The service could not be saved. Please try again.');
            setIsSubmitting(false);
            return;
        }

        for (const portfolio of [...portfolios]) {
            try {
                const body = new FormData();
                body.append('portfolioName', portfolio.name);
                if (portfolio.description) {
                    body.append('portfolioDescription', portfolio.description);
                }
                body.append('portfolioLink', portfolio.link);
                body.append('developmentDate', portfolio.developmentDate);
                if (portfolio.image) {
                    body.append('portfolioImage', portfolio.image);
                }

                const saved = await createPortfolio(targetServiceId, body);
                if (isEditMode) {
                    setSavedPortfolios((current) => [...current, saved]);
                }
                setPortfolios((current) =>
                    current.filter((item) => item.id !== portfolio.id),
                );
            } catch (cause) {
                const errorMessage = describeError(cause);
                setFormError(
                    `Your service was saved, but “${portfolio.name}” could not be uploaded. ${errorMessage} You can correct it and try again.`,
                );
                setIsSubmitting(false);
                return;
            }
        }

        setInitialValues({
            title,
            description,
            categoryIds: selectedCategoryIds,
            techStack: selectedTechStack,
            minBudget,
            maxBudget,
        });
        setShowSuccessModal(true);
        setIsSubmitting(false);
    };

    const handleSuccessConfirm = () => {
        setShowSuccessModal(false);
        if (isEditMode) {
            router.back();
            return;
        }
        router.push('/');
    };

    // US2-4. Thrown errors become the modal's message, so the 409 for a
    // service with a project gets a sentence the Provider can act on.
    // isSubmitting is shared with Save, so Save and Cancel stay disabled while
    // the delete runs. It stays true on success: the service is gone, and
    // closing "Service deleted" leaves the page.
    const handleDelete = async () => {
        if (serviceId === null || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await deleteService(serviceId);
        } catch (err) {
            setIsSubmitting(false);
            throw new Error(
                describeError(err, {
                    409: 'This service has a project linked to it, so it cannot be deleted.',
                }),
            );
        }
        setShowDeletedModal(true);
    };

    const handleCancel = () => {
        if (hasUnsavedChanges) {
            setShowLeaveModal(true);
            return;
        }
        router.back();
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
                        {isEditMode
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
                    {isEditMode ? 'Edit Service' : 'Add My Service'}
                </h1>
                <hr className="border-brand/40 mb-4" />
                <p className="type-sm text-ink-soft font-medium mb-6">
                    * Indicates required
                </p>

                <form onSubmit={handleSubmit} noValidate>
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
                                        value={title}
                                        onChange={(e) => {
                                            setTitle(e.target.value);
                                            clearError('title');
                                        }}
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
                                        value={description}
                                        onChange={(e) => {
                                            setDescription(e.target.value);
                                            clearError('description');
                                        }}
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
                                    {!categories && !categoriesError && (
                                        <p className="type-sm text-ink-placeholder">
                                            Loading categories...
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        {(categories ?? []).map((cat) => {
                                            const isSelected =
                                                selectedCategoryIds.includes(
                                                    cat.categoryId,
                                                );
                                            return (
                                                <button
                                                    type="button"
                                                    key={cat.categoryId}
                                                    onClick={() =>
                                                        handleCategoryClick(
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
                                    value={selectedTechStack}
                                    onChange={setSelectedTechStack}
                                    error={errors.techStack}
                                    onError={(message) =>
                                        message
                                            ? setErrors((prev) => ({
                                                  ...prev,
                                                  techStack: message,
                                              }))
                                            : clearError('techStack')
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
                                            value={minBudget}
                                            onChange={(e) => {
                                                setMinBudget(e.target.value);
                                                clearError('minBudget');
                                            }}
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
                                            value={maxBudget}
                                            onChange={(e) => {
                                                setMaxBudget(e.target.value);
                                                clearError('maxBudget');
                                            }}
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
                            onSavedChange={(updated) =>
                                setSavedPortfolios((current) =>
                                    current.map((item) =>
                                        item.portfolioId === updated.portfolioId
                                            ? updated
                                            : item,
                                    ),
                                )
                            }
                            pending={portfolios}
                            onAddPending={handleAddPortfolio}
                            onRemovePending={handleRemovePortfolio}
                        />
                    </div>

                    {formError && (
                        <p className="mt-4 type-sm text-danger font-medium">
                            {formError}
                        </p>
                    )}

                    <div className="mt-8 flex items-center justify-end gap-3">
                        {isEditMode && (
                            <Button
                                type="button"
                                variant="danger"
                                onClick={() => setShowDeleteModal(true)}
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
                                (isEditMode && !hasUnsavedChanges)
                            }
                            className="px-5 py-2 rounded-button bg-brand text-surface-white type-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSubmitting
                                ? 'Saving…'
                                : createdServiceId
                                  ? 'Retry Portfolio Upload'
                                  : isEditMode
                                    ? 'Save Changes'
                                    : 'Add Service'}
                        </button>
                    </div>
                </form>
            </div>

            <SuccessModal
                isOpen={showSuccessModal}
                onClose={handleSuccessConfirm}
                title={
                    isEditMode
                        ? 'Service updated successfully'
                        : 'Service added successfully'
                }
            />

            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete this service listing?"
                description={`${initialValues?.title || 'This service'} will be removed and Receivers will no longer see it in search results. This can't be undone.`}
                confirmLabel="Delete listing"
            />

            <SuccessModal
                isOpen={showDeletedModal}
                onClose={() => router.replace('/profile/view')}
                title="Service deleted"
            />

            <UnsavedChangesModal
                isOpen={showLeaveModal}
                onKeepEditing={() => setShowLeaveModal(false)}
                onDiscard={() => {
                    setShowLeaveModal(false);
                    router.back();
                }}
            />
        </div>
    );
}
