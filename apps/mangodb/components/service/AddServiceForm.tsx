'use client';

import { useCallback, useId, useState } from 'react';
import { createService } from '@/lib/service';
import { FieldErrors, toFormErrors } from '@/lib/validation';
import FieldError from '@/components/ui/FieldError';
import ModalShell from '@/components/ui/ModalShell';

export type ServiceData = {
    listingId?: number;
    listingTitle?: string;
    description?: string;
    techStack?: string;
    serviceCategory?: string;
    minBudget?: string;
    maxBudget?: string;
};

export interface ServiceSummary {
    listingId: number;
    listingTitle: string;
    minBudget: number | null;
    maxBudget: number | null;
    categories: string[];
    company: {
        companyId: number;
        companyName: string;
        companyPhoto: string | null;
        techStack: string[];
    };
}

export const SERVICE_FIELDS = {
    title: 'title',
    description: 'description',
    techStack: 'techStack',
    serviceCategory: 'serviceCategory',
    minBudget: 'minBudget',
    maxBudget: 'maxBudget',
} as const;

export type ServiceErrors = FieldErrors<
    (typeof SERVICE_FIELDS)[keyof typeof SERVICE_FIELDS]
>;

type AddServiceModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: ServiceData) => void;
};

export default function AddServiceModal({
    isOpen,
    onClose,
    onSave,
}: AddServiceModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [techStack, setTechStack] = useState('');
    const [serviceCategory, setServiceCategory] = useState('');
    const [minBudget, setMinBudget] = useState('');
    const [maxBudget, setMaxBudget] = useState('');

    const [errors, setErrors] = useState<ServiceErrors>({});
    const [formError, setFormError] = useState<string | null>(null);

    const clearError = (field: keyof ServiceErrors) =>
        setErrors((prev) => ({ ...prev, [field]: undefined }));

    const resetForm = useCallback(() => {
        setTitle('');
        setDescription('');
        setTechStack('');
        setServiceCategory('');
        setMinBudget('');
        setMaxBudget('');
        setErrors({});
        setFormError(null);
    }, []);

    const titleId = useId();

    const handleClose = useCallback(() => {
        resetForm();
        onClose();
    }, [onClose, resetForm]);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setFormError(null);

        // Budget validation
        if (minBudget && maxBudget && Number(minBudget) > Number(maxBudget)) {
            setErrors({
                maxBudget: 'Max budget cannot be less than min budget.',
            });
            return;
        }

        try {
            const formData = new FormData();

            formData.append('title', title);
            formData.append('description', description);
            formData.append('techStack', techStack);
            formData.append('serviceCategory', serviceCategory);

            if (minBudget) {
                formData.append('minBudget', minBudget);
            }

            if (maxBudget) {
                formData.append('maxBudget', maxBudget);
            }

            const service = await createService(formData);

            // const newData: ServiceData = {
            //     id: service?.listingIdid,
            //     title: service?.title ?? title,
            //     description: service?.description ?? description,
            //     techStack: service?.techStack ?? techStack,
            //     serviceCategory: service?.serviceCategory ?? serviceCategory,
            //     minBudget: service?.minBudget?.toString() ?? minBudget,
            //     maxBudget: service?.maxBudget?.toString() ?? maxBudget,
            // };

            // onSave(newData);

            resetForm();
            onClose();
        } catch (cause) {
            const { fields, message } = toFormErrors(cause, SERVICE_FIELDS);
            setErrors(fields);
            setFormError(message);
        }
    };

    return (
        <ModalShell
            isOpen
            onClose={handleClose}
            labelledBy={titleId}
            backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            panelClassName="modal-scrollbar w-full max-w-[45vw] h-[92vh] max-h-[calc(100vh-2rem)] rounded-xl bg-surface p-[1.5vw] text-ink shadow-xl overflow-y-auto"
        >
            {/* -------------header----------------- */}
            <div className="flex items-center justify-between">
                <h2 id={titleId} className="type-lg">
                    Add Service
                </h2>

                <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close"
                    className="text-ink-placeholder hover:text-gray-800"
                >
                    X
                </button>
            </div>

            {/* ----------------element-1----------------- */}
            <hr className="my-3 border-brand-dark/50" />
            <div>
                <label className="my-2 block type-sm !text-[12px]">
                    *Indicates required
                </label>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block type-sm">Title*</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                clearError('title');
                            }}
                            className="h-[4.07vh] w-full rounded-input border border-brand bg-surface-white/80 px-1.5 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                            placeholder="Ex: Full Stack Web Development"
                            required
                        />
                        <FieldError message={errors.title} />
                    </div>

                    {/* Service Category */}
                    <div>
                        <label className="block type-sm">
                            Service Category*
                        </label>
                        <input
                            type="text"
                            value={serviceCategory}
                            onChange={(e) => {
                                setServiceCategory(e.target.value);
                                clearError('serviceCategory');
                            }}
                            className="h-[4.07vh] w-full rounded-input border border-brand bg-surface-white/80 px-1.5 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                            placeholder="Ex: Web Development, Design, Mobile App"
                            required
                        />
                        <FieldError message={errors.serviceCategory} />
                    </div>

                    {/* Tech Stack */}
                    <div>
                        <label className="block type-sm">Tech Stack*</label>
                        <input
                            type="text"
                            value={techStack}
                            onChange={(e) => {
                                setTechStack(e.target.value);
                                clearError('techStack');
                            }}
                            className="h-[4.07vh] w-full rounded-input border border-brand bg-surface-white/80 px-1.5 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                            placeholder="Ex: React, Next.js, Node.js, PostgreSQL"
                            required
                        />
                        <FieldError message={errors.techStack} />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block type-sm">Description*</label>
                        <textarea
                            rows={4}
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                clearError('description');
                            }}
                            className="w-full resize-none rounded-input border border-brand bg-surface-white/80 p-1.5 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                            placeholder="Describe your service offerings..."
                            required
                        />
                        <FieldError message={errors.description} />
                    </div>

                    {/* Budget Range */}
                    <div>
                        <label className="block type-sm !font-[500]">
                            Budget Range
                        </label>
                        <div className="flex gap-2">
                            {/* Min Budget */}
                            <div className="flex-1">
                                <label className="block type-sm font-normal">
                                    Min Budget ($)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={minBudget}
                                    onChange={(e) => {
                                        setMinBudget(e.target.value);
                                        clearError('minBudget');
                                    }}
                                    className="h-[4.07vh] w-full rounded-input border border-brand bg-surface-white/80 px-1.5 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                                    placeholder="500"
                                />
                                <FieldError message={errors.minBudget} />
                            </div>

                            {/* Max Budget */}
                            <div className="flex-1">
                                <label className="block type-sm font-normal">
                                    Max Budget ($)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={maxBudget}
                                    onChange={(e) => {
                                        setMaxBudget(e.target.value);
                                        clearError('maxBudget');
                                    }}
                                    className="h-[4.07vh] w-full rounded-input border border-brand bg-surface-white/80 px-1.5 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                                    placeholder="5000"
                                />
                                <FieldError message={errors.maxBudget} />
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="my-4 border-brand-dark/50" />
                {/* -----------------footer----------------- */}
                <FieldError message={formError} />

                {/* Save button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="submit"
                        className="h-[4vh] w-[7vw] rounded-status bg-brand-dark type-sm font-[500] text-surface transition-colors hover:bg-brand"
                    >
                        Save
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
