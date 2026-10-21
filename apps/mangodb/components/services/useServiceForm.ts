'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ServicePortfolio, UpdateServiceRequest } from '@mangodb/shared';
import type { PendingPortfolio } from '@/components/portfolios/PortfolioForm';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';
import { createPortfolio, listPortfolios } from '@/lib/portfolios';
import {
    createService,
    deleteService,
    getService,
    updateService,
} from '@/lib/services';
import { redirectToUnauthorized } from '@/lib/session';
import { type FieldErrors, toFormErrors } from '@/lib/validation/formErrors';
import {
    validateBudgets,
    validateListingDesc,
    validateListingTitle,
} from '@/lib/validation/listing';
import {
    SERVICE_FIELDS,
    validateServiceCategory,
    validateServiceTechStack,
} from '@/lib/validation/service';

// What the inputs hold. Budgets stay text so a half-typed number is not
// rewritten while the user types.
type ServiceValues = {
    title: string;
    description: string;
    categoryIds: number[];
    techStack: string[];
    minBudget: string;
    maxBudget: string;
};

type ServiceErrors = FieldErrors<keyof ServiceValues>;

const EMPTY_VALUES: ServiceValues = {
    title: '',
    description: '',
    categoryIds: [],
    techStack: [],
    minBudget: '',
    maxBudget: '',
};

function normalizeService(values: ServiceValues): ServiceValues {
    return {
        ...values,
        title: values.title.trim(),
        description: values.description.trim(),
        categoryIds: [...values.categoryIds].sort((a, b) => a - b),
        techStack: values.techStack.map((item) => item.trim()),
        minBudget: values.minBudget.trim(),
        maxBudget: values.maxBudget.trim(),
    };
}

function serializeService(values: ServiceValues): string {
    return JSON.stringify(normalizeService(values));
}

function changedServiceFields(
    current: ServiceValues,
    initial: ServiceValues,
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

// The rules the API also checks, so most mistakes show before a request.
function validate(values: ServiceValues): ServiceErrors {
    const errors: ServiceErrors = validateBudgets(
        values.minBudget,
        values.maxBudget,
        { maxRequired: false },
    );

    const title = validateListingTitle(values.title);
    if (title) errors.title = title;

    const description = validateListingDesc(values.description);
    if (description) errors.description = description;

    const categoryIds = validateServiceCategory(values.categoryIds);
    if (categoryIds) errors.categoryIds = categoryIds;

    if (values.techStack.length === 0) {
        errors.techStack = 'At least one tech stack item is required.';
    } else {
        const techStack = validateServiceTechStack(values.techStack);
        if (techStack) errors.techStack = techStack;
    }

    return errors;
}

// The upload body for a portfolio added before the service was saved.
function toPortfolioBody(portfolio: PendingPortfolio): FormData {
    const body = new FormData();
    body.append('portfolioName', portfolio.name);
    if (portfolio.description) {
        body.append('portfolioDescription', portfolio.description);
    }
    body.append('portfolioLink', portfolio.link);
    body.append('developmentDate', portfolio.developmentDate);
    if (portfolio.image) body.append('portfolioImage', portfolio.image);
    return body;
}

// Everything ServiceForm does besides drawing: loading the service to edit,
// the values and their errors, the portfolios, the save and the delete.
// serviceId is null when adding. companyId is the signed-in company, null
// until it loads; only that company may edit the service.
export function useServiceForm(
    serviceId: number | null,
    companyId: number | null,
) {
    const router = useRouter();
    const isEditing = serviceId !== null;

    // Add has nothing to load; Edit is loaded once the service arrives.
    const [isLoaded, setIsLoaded] = useState(!isEditing);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [values, setValues] = useState<ServiceValues>(EMPTY_VALUES);
    // What was last saved, to tell whether anything changed since.
    const [initialValues, setInitialValues] = useState<ServiceValues | null>(
        null,
    );
    const [errors, setErrors] = useState<ServiceErrors>({});
    // A save error that belongs to no one field.
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New portfolios wait here until the service exists to attach them to.
    const [pendingPortfolios, setPendingPortfolios] = useState<
        PendingPortfolio[]
    >([]);
    const [savedPortfolios, setSavedPortfolios] = useState<ServicePortfolio[]>(
        [],
    );
    // Set once a new service is created, so a failed portfolio upload can be
    // retried without creating the service twice.
    const [createdServiceId, setCreatedServiceId] = useState<number | null>(
        null,
    );

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

                const loaded: ServiceValues = {
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

                setValues(loaded);
                setInitialValues(loaded);
                setSavedPortfolios(existingPortfolios);
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

    const hasUnsavedChanges =
        isEditing &&
        initialValues !== null &&
        (serializeService(values) !== serializeService(initialValues) ||
            pendingPortfolios.length > 0);

    // The browser asks before closing a tab with unsaved edits.
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

    // Changing a field also clears that field's error.
    function setField<Field extends keyof ServiceValues>(
        field: Field,
        value: ServiceValues[Field],
    ) {
        setValues((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // For an input that checks itself, like the tech stack box.
    function setFieldError(field: keyof ServiceValues, message: string | null) {
        setErrors((prev) => ({ ...prev, [field]: message ?? undefined }));
    }

    function addPortfolio(item: PendingPortfolio) {
        setPendingPortfolios((prev) => [...prev, item]);
    }

    function removePortfolio(id: string) {
        setPendingPortfolios((prev) => prev.filter((p) => p.id !== id));
    }

    function updateSavedPortfolio(updated: ServicePortfolio) {
        setSavedPortfolios((prev) =>
            prev.map((item) =>
                item.portfolioId === updated.portfolioId ? updated : item,
            ),
        );
    }

    // Saves the service, then uploads each pending portfolio. Resolves true
    // when everything saved, so the form can show its success modal.
    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFormError(null);

        const newErrors = validate(values);
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return false;

        const min =
            values.minBudget.trim() !== ''
                ? Number(values.minBudget)
                : undefined;
        const max =
            values.maxBudget.trim() !== ''
                ? Number(values.maxBudget)
                : undefined;

        setIsSubmitting(true);
        let targetServiceId = serviceId ?? createdServiceId;

        try {
            if (isEditing && targetServiceId && initialValues) {
                const changes = changedServiceFields(values, initialValues);
                if (Object.keys(changes).length > 0) {
                    await updateService(targetServiceId, changes);
                }
            } else if (!targetServiceId) {
                const created = await createService({
                    listingTitle: values.title.trim(),
                    listingDesc: values.description.trim(),
                    categoryIds: values.categoryIds,
                    techStack: values.techStack,
                    ...(min !== undefined && { minBudget: min }),
                    ...(max !== undefined && { maxBudget: max }),
                });
                targetServiceId = created.serviceId;
                setCreatedServiceId(targetServiceId);
            }
        } catch (cause) {
            const { fields, message } = toFormErrors(cause, SERVICE_FIELDS);
            setErrors(fields);
            setFormError(message);
            setIsSubmitting(false);
            return false;
        }

        if (!targetServiceId) {
            setFormError('The service could not be saved. Please try again.');
            setIsSubmitting(false);
            return false;
        }

        for (const portfolio of [...pendingPortfolios]) {
            try {
                const saved = await createPortfolio(
                    targetServiceId,
                    toPortfolioBody(portfolio),
                );
                if (isEditing) {
                    setSavedPortfolios((current) => [...current, saved]);
                }
                removePortfolio(portfolio.id);
            } catch (cause) {
                const errorMessage = describeError(cause);
                setFormError(
                    `Your service was saved, but “${portfolio.name}” could not be uploaded. ${errorMessage} You can correct it and try again.`,
                );
                setIsSubmitting(false);
                return false;
            }
        }

        setInitialValues(values);
        setIsSubmitting(false);
        return true;
    }

    // US2-4. Thrown errors become the modal's message, so the 409 for a
    // service with a project gets a sentence the Provider can act on.
    // isSubmitting is shared with Save, so Save and Cancel stay disabled while
    // the delete runs. It stays true on success: the page is leaving.
    async function handleDelete() {
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
        router.replace('/profile/view');
    }

    return {
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
        // The name the service was last saved under, for the delete prompt.
        savedTitle: initialValues?.title ?? null,
        createdServiceId,
        pendingPortfolios,
        savedPortfolios,
        addPortfolio,
        removePortfolio,
        updateSavedPortfolio,
        handleSubmit,
        handleDelete,
    };
}
