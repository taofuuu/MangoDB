'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import type { Certificate } from '@mangodb/shared';
import MonthDropdown from './MonthDropdown';
import YearDropdown from './YearDropdown';
import { createCertificate, updateCertificate } from '@/lib/certificates';
import { isStorageImage } from '@/lib/images';
import { toFormErrors, type FieldErrors } from '@/lib/validation/formErrors';
import FileUpload from '@/components/ui/FileUpload';
import FieldError from '@/components/ui/FieldError';
import ModalShell from '@/components/ui/ModalShell';

// Which input on this form each API field belongs under. Month and year share
// one message because they sit on one row and are wrong together.
const CERTIFICATE_FIELDS = {
    certTitle: 'name',
    organization: 'organization',
    issueMonth: 'issueDate',
    issueYear: 'issueDate',
    expireMonth: 'expireDate',
    expireYear: 'expireDate',
    credentialId: 'credentialId',
    credentialUrl: 'credentialUrl',
    certImage: 'image',
} as const;

type CertificateErrors = FieldErrors<
    (typeof CERTIFICATE_FIELDS)[keyof typeof CERTIFICATE_FIELDS]
>;

type CertificateFormProps = {
    onClose: () => void;
    // The saved certificate, as the API returned it.
    onSave: (certificate: Certificate) => void;
    // The one being edited. Absent when adding.
    certificate?: Certificate | undefined;
};

const text = (value: number | string | null | undefined) =>
    value == null ? '' : String(value);

// Add a certificate, or edit a saved one. Mounted while open, so every
// opening starts from a fresh form.
export default function CertificateForm({
    onClose,
    onSave,
    certificate,
}: CertificateFormProps) {
    const isEdit = certificate !== undefined;
    const titleId = useId();

    const [name, setName] = useState(certificate?.certTitle ?? '');
    const [organization, setOrganization] = useState(
        certificate?.organization ?? '',
    );
    const [issueMonth, setIssueMonth] = useState(text(certificate?.issueMonth));
    const [issueYear, setIssueYear] = useState(text(certificate?.issueYear));
    const [expireMonth, setExpireMonth] = useState(
        text(certificate?.expireMonth),
    );
    const [expireYear, setExpireYear] = useState(text(certificate?.expireYear));
    const [credentialId, setCredentialId] = useState(
        certificate?.credentialId ?? '',
    );
    const [credentialUrl, setCredentialUrl] = useState(
        certificate?.credentialUrl ?? '',
    );
    const [image, setImage] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<CertificateErrors>({});
    // Only what no input can hold: offline, or a 500.
    const [formError, setFormError] = useState<string | null>(null);

    // Touching a box clears what was wrong with it, so a field the user has
    // already fixed stops looking broken.
    const clearError = (field: keyof CertificateErrors) =>
        setErrors((prev) => ({ ...prev, [field]: undefined }));

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setErrors({});
        setFormError(null);

        // The API checks this too; here it saves a round trip.
        if (issueYear && issueMonth && expireYear && expireMonth) {
            const issued = Number(issueYear) * 100 + Number(issueMonth);
            const expires = Number(expireYear) * 100 + Number(expireMonth);
            if (expires < issued) {
                setErrors({
                    expireDate:
                        'Expiration date cannot be before the issue date.',
                });
                return;
            }
        }

        const body = new FormData();
        body.append('certTitle', name);
        body.append('organization', organization);
        const optional = {
            issueMonth,
            issueYear,
            expireMonth,
            expireYear,
            credentialId,
            credentialUrl,
        };
        for (const [field, value] of Object.entries(optional)) {
            // An edit sends blanks too: the API reads '' as null, which is
            // the only way to clear a field that already has a value.
            if (isEdit || value) body.append(field, value);
        }
        // Without a new file, an edit keeps the saved image.
        if (image) body.append('certImage', image);

        setIsSubmitting(true);
        try {
            const saved = isEdit
                ? await updateCertificate(certificate.certificateId, body)
                : await createCertificate(body);
            onSave(saved);
            onClose();
        } catch (cause: unknown) {
            const { fields, message } = toFormErrors(cause, CERTIFICATE_FIELDS);
            setErrors(fields);
            setFormError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClassName =
        'h-[4.07vh] w-full px-2.5 rounded-input border border-brand bg-surface-white/80 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand';
    const savedImage =
        isEdit && !image && isStorageImage(certificate.certImage)
            ? certificate.certImage
            : null;

    return (
        <ModalShell
            isOpen
            onClose={onClose}
            isBusy={isSubmitting}
            labelledBy={titleId}
            backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            panelClassName="w-full max-w-[45vw] rounded-xl bg-surface p-[1.5vw] text-ink shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto max-md:max-w-[90vw]"
        >
            <div className="flex items-center justify-between">
                <h2 id={titleId} className="type-lg font-semibold">
                    {isEdit
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
            <p className="my-2 type-sm !text-[12px]">*Indicates required</p>

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
                            value={name}
                            onChange={(event) => {
                                setName(event.target.value);
                                clearError('name');
                            }}
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
                            value={organization}
                            onChange={(event) => {
                                setOrganization(event.target.value);
                                clearError('organization');
                            }}
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
                                    value={issueMonth}
                                    onChange={(value) => {
                                        setIssueMonth(value);
                                        clearError('issueDate');
                                    }}
                                />
                            </div>
                            <div className="flex-1">
                                <p className="mb-1 type-xs text-ink-soft font-normal">
                                    Year
                                </p>
                                <YearDropdown
                                    value={issueYear}
                                    onChange={(value) => {
                                        setIssueYear(value);
                                        clearError('issueDate');
                                    }}
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
                                    value={expireMonth}
                                    onChange={(value) => {
                                        setExpireMonth(value);
                                        clearError('expireDate');
                                    }}
                                />
                            </div>
                            <div className="flex-1">
                                <p className="mb-1 type-xs text-ink-soft font-normal">
                                    Year
                                </p>
                                <YearDropdown
                                    value={expireYear}
                                    onChange={(value) => {
                                        setExpireYear(value);
                                        clearError('expireDate');
                                    }}
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
                            value={credentialId}
                            onChange={(event) => {
                                setCredentialId(event.target.value);
                                clearError('credentialId');
                            }}
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
                            value={credentialUrl}
                            onChange={(event) => {
                                setCredentialUrl(event.target.value);
                                clearError('credentialUrl');
                            }}
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
                                setErrors((prev) => ({
                                    ...prev,
                                    image: message,
                                }))
                            }
                            value={image}
                            onChange={(next) => {
                                setImage(next);
                                clearError('image');
                            }}
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
