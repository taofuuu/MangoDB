'use client';

import { useId } from 'react';
import Image from 'next/image';
import type { Certificate } from '@mangodb/shared';
import MonthDropdown from './MonthDropdown';
import YearDropdown from './YearDropdown';
import { useCertificateForm } from './useCertificateForm';
import { isStorageImage } from '@/lib/images';
import FileUpload from '@/components/ui/FileUpload';
import FieldError from '@/components/ui/FieldError';
import ModalShell from '@/components/ui/ModalShell';

export type CertificateFormProps = {
    onClose: () => void;
    // The saved certificate, as the API returned it.
    onSave: (certificate: Certificate) => void;
    // The one being edited. Absent when adding.
    certificate?: Certificate | undefined;
};

// Add a certificate, or edit a saved one. Mounted while open, so every
// opening starts from a fresh form. The values and save live in
// useCertificateForm.
export default function CertificateForm(props: CertificateFormProps) {
    const { onClose, certificate } = props;
    const titleId = useId();
    const {
        values,
        setField,
        setFieldError,
        errors,
        formError,
        isSubmitting,
        isEditing,
        handleSubmit,
    } = useCertificateForm(props);

    const inputClassName =
        'h-[4.07vh] w-full px-2.5 rounded-input border border-brand bg-surface-white/80 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand';
    const savedImage =
        certificate && !values.image && isStorageImage(certificate.certImage)
            ? certificate.certImage
            : null;

    return (
        <ModalShell
            isOpen
            onClose={onClose}
            isBusy={isSubmitting}
            labelledBy={titleId}
            backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            panelClassName="w-full max-w-[45vw] rounded-xl bg-surface p-[1.5vw] text-ink shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto max-md:max-w-[90vw]"
        >
            <div className="flex items-center justify-between">
                <h2 id={titleId} className="type-lg font-semibold">
                    {isEditing
                        ? 'Edit license or certification'
                        : 'Add license or certification'}
                </h2>

                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    aria-label="Close"
                    className="text-ink-placeholder hover:text-ink disabled:opacity-50"
                >
                    ✕
                </button>
            </div>

            <hr className="border-brand-dark/50 my-2" />
            <p className="my-2 type-xs">*Indicates required</p>

            <form onSubmit={handleSubmit}>
                <div className="space-y-3">
                    <div>
                        <label
                            htmlFor="certificate-name"
                            className="block type-sm font-medium"
                        >
                            Name*
                        </label>
                        <input
                            id="certificate-name"
                            type="text"
                            value={values.name}
                            onChange={(event) =>
                                setField('name', event.target.value)
                            }
                            className={inputClassName}
                            placeholder="Ex: Microsoft certified network associate security"
                            required
                        />
                        <FieldError message={errors.name} />
                    </div>

                    <div>
                        <label
                            htmlFor="certificate-organization"
                            className="block type-sm font-medium"
                        >
                            Issuing organization*
                        </label>
                        <input
                            id="certificate-organization"
                            type="text"
                            value={values.organization}
                            onChange={(event) =>
                                setField('organization', event.target.value)
                            }
                            className={inputClassName}
                            placeholder="Ex: Microsoft"
                            required
                        />
                        <FieldError message={errors.organization} />
                    </div>

                    <fieldset>
                        <legend className="block type-sm font-medium">
                            Issue date
                        </legend>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <p className="mb-1 type-xs text-ink-soft font-normal">
                                    Month
                                </p>
                                <MonthDropdown
                                    value={values.issueMonth}
                                    onChange={(value) =>
                                        setField('issueMonth', value)
                                    }
                                />
                            </div>
                            <div className="flex-1">
                                <p className="mb-1 type-xs text-ink-soft font-normal">
                                    Year
                                </p>
                                <YearDropdown
                                    value={values.issueYear}
                                    onChange={(value) =>
                                        setField('issueYear', value)
                                    }
                                    minYear={1990}
                                    maxYear={new Date().getFullYear()}
                                />
                            </div>
                        </div>
                        <FieldError message={errors.issueDate} />
                    </fieldset>

                    <fieldset>
                        <legend className="block type-sm font-medium">
                            Expiration date
                        </legend>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <p className="mb-1 type-xs text-ink-soft font-normal">
                                    Month
                                </p>
                                <MonthDropdown
                                    value={values.expireMonth}
                                    onChange={(value) =>
                                        setField('expireMonth', value)
                                    }
                                />
                            </div>
                            <div className="flex-1">
                                <p className="mb-1 type-xs text-ink-soft font-normal">
                                    Year
                                </p>
                                <YearDropdown
                                    value={values.expireYear}
                                    onChange={(value) =>
                                        setField('expireYear', value)
                                    }
                                    minYear={1990}
                                    maxYear={new Date().getFullYear() + 20}
                                />
                            </div>
                        </div>
                        <FieldError message={errors.expireDate} />
                    </fieldset>

                    <div>
                        <label
                            htmlFor="certificate-credential-id"
                            className="block type-sm font-medium"
                        >
                            Credential ID
                        </label>
                        <input
                            id="certificate-credential-id"
                            type="text"
                            value={values.credentialId}
                            onChange={(event) =>
                                setField('credentialId', event.target.value)
                            }
                            className={inputClassName}
                            placeholder="Ex: AZ-900-123456"
                        />
                        <FieldError message={errors.credentialId} />
                    </div>

                    <div>
                        <label
                            htmlFor="certificate-credential-url"
                            className="block type-sm font-medium"
                        >
                            Credential URL
                        </label>
                        <input
                            id="certificate-credential-url"
                            type="url"
                            value={values.credentialUrl}
                            onChange={(event) =>
                                setField('credentialUrl', event.target.value)
                            }
                            className={inputClassName}
                            placeholder="https://learn.microsoft.com/..."
                        />
                        <FieldError message={errors.credentialUrl} />
                    </div>

                    {/* Only our own uploads, since next/image throws on any
                        other host. */}
                    {savedImage && (
                        <div className="mt-2">
                            <p className="mb-1 type-sm">
                                Current certificate image
                            </p>
                            <Image
                                src={savedImage}
                                alt="Current certificate"
                                width={192}
                                height={128}
                                className="h-32 w-48 rounded-lg border border-brand object-contain"
                            />
                        </div>
                    )}

                    <div>
                        <FileUpload
                            onError={(message) =>
                                setFieldError('image', message)
                            }
                            value={values.image}
                            onChange={(next) => setField('image', next)}
                        />
                        <FieldError message={errors.image} />
                    </div>
                </div>

                <hr className="border-brand-dark/50 my-4" />
                <FieldError message={formError} />
                <div className="flex justify-end items-center gap-3 pt-1">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-status bg-brand-dark px-6 h-[4vh] text-surface type-sm font-medium hover:bg-brand-darker transition-colors disabled:opacity-50 min-w-[80px]"
                    >
                        {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
