'use client';

import { useId } from 'react';
import type { ServicePortfolio } from '@mangodb/shared';
import FileUpload from '@/components/ui/FileUpload';
import FieldError from '@/components/ui/FieldError';
import ModalShell from '@/components/ui/ModalShell';
import DevelopmentDateFields from './DevelopmentDateFields';
import { usePortfolioForm } from './usePortfolioForm';

// A portfolio added to a service that is not saved yet. ServiceForm uploads
// it once the service exists, since a portfolio needs a serviceId.
export interface PendingPortfolio {
    id: string;
    name: string;
    description: string;
    link: string;
    developmentDate: string;
    image: File | null;
}

export type PortfolioFormProps = { onClose: () => void } & (
    | { mode: 'add'; onAdd: (item: PendingPortfolio) => void }
    | {
          mode: 'edit';
          portfolio: ServicePortfolio;
          onSave: (portfolio: ServicePortfolio) => void;
      }
);

// Add a portfolio to a service, or edit a saved one. Mounted while open, so
// every opening starts from a fresh form. The values and save live in
// usePortfolioForm.
export default function PortfolioForm(props: PortfolioFormProps) {
    const { onClose } = props;
    const titleId = useId();
    const {
        values,
        setField,
        setFieldError,
        errors,
        formError,
        isSaving,
        isEditing,
        handleSubmit,
    } = usePortfolioForm(props);

    // Back to 1950, and forward to the saved year if it is in the future.
    const currentYear = new Date().getFullYear();
    const savedYear =
        props.mode === 'edit'
            ? Number(props.portfolio.developmentDate.split('-')[0])
            : 0;
    const latestYear = Math.max(savedYear || currentYear, currentYear);
    const earliestYear = Math.min(savedYear || currentYear, 1950);

    const title = isEditing ? 'Edit Portfolio' : 'Add Portfolio';
    const inputClassName =
        'h-[4.07vh] w-full rounded-input border border-brand bg-surface-white/80 px-1.5 type-sm text-ink focus:outline-none focus:ring-1 focus:ring-brand';

    return (
        <ModalShell
            isOpen
            onClose={onClose}
            isBusy={isSaving}
            labelledBy={titleId}
            backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            panelClassName="modal-scrollbar h-[92vh] w-full max-w-[45vw] overflow-y-auto rounded-xl bg-surface p-[1.5vw] text-ink shadow-xl max-md:h-[90vh]"
        >
            <header className="flex items-center justify-between">
                <h2 id={titleId} className="type-lg">
                    {title}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    aria-label={`Close ${title.toLowerCase()}`}
                    className="text-ink-placeholder hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                    X
                </button>
            </header>

            <hr className="border-brand-dark/50" />
            <p className="my-2 type-xs">*Indicates required</p>

            <form onSubmit={handleSubmit} noValidate>
                <div className="space-y-2">
                    <div>
                        <label
                            className="block type-sm"
                            htmlFor="portfolio-name"
                        >
                            Name*
                        </label>
                        <input
                            id="portfolio-name"
                            type="text"
                            maxLength={255}
                            value={values.name}
                            onChange={(event) =>
                                setField('name', event.target.value)
                            }
                            placeholder="Ex. E-commerce Platform Redesign"
                            className={inputClassName}
                        />
                        <FieldError message={errors.name} />
                    </div>

                    <div>
                        <label
                            className="block type-sm"
                            htmlFor="portfolio-description"
                        >
                            Description
                        </label>
                        <textarea
                            id="portfolio-description"
                            maxLength={2000}
                            value={values.description}
                            onChange={(event) =>
                                setField('description', event.target.value)
                            }
                            placeholder="Brief description of the work done..."
                            className="h-[9.65vh] w-full resize-none rounded-input border border-brand bg-surface-white/80 px-1.5 py-1.5 type-sm text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                        <FieldError message={errors.description} />
                    </div>

                    <div>
                        <label
                            className="block type-sm font-medium"
                            htmlFor="portfolio-link"
                        >
                            Link to your portfolio*
                        </label>
                        <input
                            id="portfolio-link"
                            type="url"
                            maxLength={255}
                            value={values.link}
                            onChange={(event) =>
                                setField('link', event.target.value)
                            }
                            placeholder="https://example.com/project"
                            className={inputClassName}
                        />
                        <FieldError message={errors.link} />
                    </div>

                    <fieldset>
                        <legend className="type-sm !font-[500]">
                            Development date*
                        </legend>
                        <DevelopmentDateFields
                            value={values.developmentDate}
                            onChange={(next) =>
                                setField('developmentDate', next)
                            }
                            minYear={earliestYear}
                            maxYear={latestYear}
                        />
                        <FieldError message={errors.developmentDate} />
                    </fieldset>

                    <FileUpload
                        value={values.image}
                        onChange={(file) => setField('image', file)}
                        onError={(message) => setFieldError('image', message)}
                        accept="image/png,image/jpeg,image/webp"
                        label="Upload Image"
                        className="upload-box mx-auto my-8 flex h-[20.64vh] w-[14.11vw] cursor-pointer flex-col items-center justify-center rounded-lg bg-brand-mist/40 hover:bg-fill-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    />
                    <FieldError message={errors.image} />
                </div>

                <hr className="border-brand-dark/50" />
                <FieldError message={formError} />
                <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="h-[4vh] w-[7vw] rounded-status bg-brand-dark type-sm font-[500] text-surface transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {!isEditing ? 'Add' : isSaving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
