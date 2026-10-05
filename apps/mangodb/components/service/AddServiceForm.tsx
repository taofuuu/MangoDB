'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FieldError from '@/components/ui/FieldError';
import {
    toFormErrors,
    SERVICE_FIELDS,
    PREDEFINED_TECH_STACKS,
    validateServiceTitle,
    validateServiceDescription,
    validateServiceCategory,
    validateServiceBudgets,
} from '@/lib/validation';
import { createService, createPortfolioForListing } from '@/lib/service';
import AddPortfolioModal, { type PendingPortfolio } from './AddPortfolioModal';
import SuccessModal from './SuccessModal';
import UnauthorizedPage from './UnauthorizedPage';

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

const PREDEFINED_CATEGORIES = [
    { id: 1, name: 'Web Development' },
    { id: 2, name: 'Mobile App Development' },
    { id: 3, name: 'Hardware & IoT' },
    { id: 4, name: 'IT Consulting & Security' },
    { id: 5, name: 'Artificial Intelligence (AI)' },
    { id: 6, name: 'UI/UX Design' },
    { id: 7, name: 'ERP & CRM Systems' },
    { id: 8, name: 'Digital Marketing & SEO' },
    { id: 12, name: 'Other' },
] as const;

export default function AddServiceForm() {
    const router = useRouter();

    // ── ALL HOOKS MUST BE DECLARED AT THE TOP LEVEL BEFORE ANY RETURNS ──
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

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
    const [showPortfolioModal, setShowPortfolioModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Errors & Loading state
    const [errors, setErrors] = useState<ServiceErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function checkAuth() {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/auth/me', {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                if (!res.ok) {
                    setIsAuthorized(false);
                    return;
                }

                const user = await res.json();
                const role = user.role?.toLowerCase();
                const accountType = user.accountType?.toUpperCase();

                const hasProviderRole =
                    role === 'provider' ||
                    role === 'both' ||
                    accountType === 'PROVIDER' ||
                    accountType === 'BOTH';

                setIsAuthorized(hasProviderRole);
            } catch {
                setIsAuthorized(false);
            }
        }

        checkAuth();
    }, []);

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

    const handleTechClick = (tech: string) => {
        clearError('techStack');
        setSelectedTechStack((prev) =>
            prev.includes(tech)
                ? prev.filter((item) => item !== tech)
                : [...prev, tech],
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

        const titleErr = validateServiceTitle(title);
        if (titleErr) newErrors.title = titleErr;

        const descErr = validateServiceDescription(description);
        if (descErr) newErrors.description = descErr;

        const catErr = validateServiceCategory(selectedCategoryIds);
        if (catErr) newErrors.categoryIds = catErr;

        const budgetErrs = validateServiceBudgets(minBudget, maxBudget);
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
        try {
            const created = await createService({
                listingTitle: title,
                listingDesc: description,
                categoryIds: selectedCategoryIds,
                ...(min !== undefined && { minBudget: min }),
                ...(max !== undefined && { maxBudget: max }),
            });

            for (const p of portfolios) {
                const body = new FormData();
                body.append('portfolioName', p.name);
                if (p.description)
                    body.append('portfolioDescription', p.description);
                body.append('portfolioLink', p.link);
                body.append('developmentDate', p.developmentDate);
                if (p.image) body.append('portfolioImage', p.image);
                await createPortfolioForListing(created.listingId, body);
            }

            setShowSuccessModal(true);
        } catch (cause) {
            const { fields, message } = toFormErrors(cause, SERVICE_FIELDS);
            setErrors(fields as ServiceErrors);
            setFormError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSuccessConfirm = () => {
        setShowSuccessModal(false);
        router.push('/');
    };

    // ── EARLY RETURNS PLACE BELOW ALL HOOKS ──
    if (isAuthorized === null) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <p className="type-sm text-ink-placeholder">
                    Checking permissions...
                </p>
            </div>
        );
    }

    if (!isAuthorized) {
        return <UnauthorizedPage />;
    }

    return (
        <div className="min-h-screen bg-surface py-12 px-6 flex justify-center text-ink">
            <div className="w-full max-w-[1100px]">
                <h1 className="type-hd mb-4">Add My Service</h1>
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
                                    <div className="flex flex-wrap gap-2">
                                        {PREDEFINED_CATEGORIES.map((cat) => {
                                            const isSelected =
                                                selectedCategoryIds.includes(
                                                    cat.id,
                                                );
                                            return (
                                                <button
                                                    type="button"
                                                    key={cat.id}
                                                    onClick={() =>
                                                        handleCategoryClick(
                                                            cat.id,
                                                        )
                                                    }
                                                    className={`px-3.5 py-1.5 rounded-status type-xs font-medium transition-colors border ${
                                                        isSelected
                                                            ? 'bg-brand text-surface-white border-brand'
                                                            : 'bg-brand-tint text-ink-soft border-transparent hover:bg-brand-mist'
                                                    }`}
                                                >
                                                    {cat.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <FieldError message={errors.categoryIds} />
                                </div>

                                {/* Techstack */}
                                <div>
                                    <label className="block type-sm font-semibold mb-2 text-ink">
                                        Techstack
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {PREDEFINED_TECH_STACKS.map((tech) => {
                                            const isSelected =
                                                selectedTechStack.includes(
                                                    tech,
                                                );
                                            return (
                                                <button
                                                    type="button"
                                                    key={tech}
                                                    onClick={() =>
                                                        handleTechClick(tech)
                                                    }
                                                    className={`px-3.5 py-1.5 rounded-status type-xs font-medium transition-colors border ${
                                                        isSelected
                                                            ? 'bg-brand text-surface-white border-brand'
                                                            : 'bg-brand-tint text-ink-soft border-transparent hover:bg-brand-mist'
                                                    }`}
                                                >
                                                    {tech}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <FieldError message={errors.techStack} />
                                </div>

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

                        {/* RIGHT COLUMN: Portfolio */}
                        <div className="w-full md:w-[400px] bg-surface-white rounded-2xl p-6 shadow-sm border border-line flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="type-md font-bold text-ink">
                                    Portfolio
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setShowPortfolioModal(true)}
                                    className="px-4 py-1.5 border border-brand rounded-button type-xs font-semibold text-brand hover:bg-brand-tint transition-colors"
                                >
                                    Add Portfolio
                                </button>
                            </div>

                            {portfolios.length === 0 ? (
                                <p className="type-sm text-ink-placeholder text-center mt-4">
                                    No portfolios added yet.
                                </p>
                            ) : (
                                <div className="flex-1 overflow-y-auto modal-scrollbar pr-2 space-y-3 max-h-[380px]">
                                    {portfolios.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between border border-line rounded-input p-3 type-sm"
                                        >
                                            <span className="font-medium text-ink type-xs truncate max-w-[180px]">
                                                {item.name}
                                            </span>
                                            <div className="flex items-center gap-3 shrink-0 ml-2">
                                                {item.image && (
                                                    <span className="type-xs text-ink-placeholder italic truncate max-w-[80px]">
                                                        {item.image.name}
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRemovePortfolio(
                                                            item.id,
                                                        )
                                                    }
                                                    className="type-xs font-semibold text-danger hover:text-danger-hover transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {formError && (
                        <p className="mt-4 type-sm text-danger font-medium">
                            {formError}
                        </p>
                    )}

                    <div className="mt-8 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            disabled={isSubmitting}
                            className="px-5 py-2 rounded-button bg-fill-muted text-surface-white type-sm font-semibold hover:bg-ink-placeholder transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            Cancel Service
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2 rounded-button bg-brand text-surface-white type-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Saving…' : 'Add Service'}
                        </button>
                    </div>
                </form>
            </div>

            <AddPortfolioModal
                isOpen={showPortfolioModal}
                onClose={() => setShowPortfolioModal(false)}
                onAdd={handleAddPortfolio}
            />

            <SuccessModal
                isOpen={showSuccessModal}
                onClose={handleSuccessConfirm}
                title="Service Added Successfully"
            />
        </div>
    );
}
