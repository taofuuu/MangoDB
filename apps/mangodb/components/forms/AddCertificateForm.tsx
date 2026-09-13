'use client';

import { useCallback, useId, useState } from 'react';
import MonthDropdown from '../sm-detail/MonthDropdown';
import YearDropdown from '../sm-detail/YearDropdown';
import {
    CERTIFICATE_FIELDS,
    type CertificateData,
    type CertificateErrors,
} from './EditCertificateForm';
import { createCertificate } from '@/lib/certificate';
import { toFormErrors } from '@/lib/validation';
import FileUpload from '../sm-detail/FileUpload';
import FieldError from '@/components/ui/FieldError';
import ModalShell from '@/components/ui/ModalShell';

type FormModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CertificateData) => void;
};

export default function FormModal({ isOpen, onClose, onSave }: FormModalProps) {
    const [name, setName] = useState('');
    const [organize, setOrganize] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    const [exMonth, setExMonth] = useState('');
    const [exYear, setExYear] = useState('');
    const [credID, setCredID] = useState('');
    const [credURL, setCredURL] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<CertificateErrors>({});
    // Only what no input can hold: offline, or a 500.
    const [formError, setFormError] = useState<string | null>(null);

    // Touching a box clears what was wrong with it, so a field the user has
    // already fixed stops looking broken.
    const clearError = (field: keyof CertificateErrors) =>
        setErrors((prev) => ({ ...prev, [field]: undefined }));

    const resetForm = () => {
        setName('');
        setOrganize('');
        setMonth('');
        setYear('');
        setExMonth('');
        setExYear('');
        setCredID('');
        setCredURL('');
        setFile(null);
        setErrors({});
        setFormError(null);
    };

    const titleId = useId();

    // One close path, so Escape and the backdrop clear the form the same way
    // the X does. useCallback because ModalShell keys an effect on it.
    const handleClose = useCallback(() => {
        resetForm();
        onClose();
        // resetForm only touches setters, which React keeps stable.
    }, [onClose]);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setFormError(null);

        // Validate expiration date against issue date
        if (year && exYear && month && exMonth) {
            const issueDate = Number(year) * 12 + Number(month);
            const expireDate = Number(exYear) * 12 + Number(exMonth);

            if (expireDate < issueDate) {
                setErrors({
                    expireDate:
                        'Expiration date cannot be before the issue date.',
                });
                return;
            }
        }

        try {
            const formData = new FormData();

            formData.append('certTitle', name);
            formData.append('organization', organize);

            if (month) {
                formData.append('issueMonth', month);
            }

            if (year) {
                formData.append('issueYear', year);
            }

            if (exMonth) {
                formData.append('expireMonth', exMonth);
            }

            if (exYear) {
                formData.append('expireYear', exYear);
            }

            if (credID) {
                formData.append('credentialId', credID);
            }

            if (credURL) {
                formData.append('credentialUrl', credURL);
            }

            if (file) {
                formData.append('certImage', file);
            }

            const cert = await createCertificate(formData);

            const newData: CertificateData = {
                id: cert.certificateId,
                name: cert.certTitle,
                organize: cert.organization,
                month: cert.issueMonth?.toString() ?? '',
                year: cert.issueYear?.toString() ?? '',
                exMonth: cert.expireMonth?.toString() ?? '',
                exYear: cert.expireYear?.toString() ?? '',
                credID: cert.credentialId ?? '',
                credURL: cert.credentialUrl ?? '',
                ...(file !== null && { file }),
                certImage: cert.certImage ?? null,
            };

            onSave(newData);

            resetForm();
            onClose();
        } catch (cause) {
            const { fields, message } = toFormErrors(cause, CERTIFICATE_FIELDS);
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
            <div className=" flex items-center justify-between">
                <h2 id={titleId} className="type-lg">
                    Add license or certification
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
            <hr className="border-brand-dark/50" />
            <div>
                <label className="my-2 block type-sm !text-[12px]">
                    *Indicates required
                </label>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="space-y-2">
                    {/* Name */}
                    <div>
                        <label className="block type-sm">Name*</label>

                        <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                clearError('name');
                            }}
                            className="h-[4.07vh] px-1.5 w-full rounded-input border border-brand bg-surface-white/80 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                            placeholder="Ex: Microsoft certified network associate security"
                            required
                        />
                        <FieldError message={errors.name} />
                    </div>
                    {/* Organization */}
                    <div>
                        <label className="block type-sm">
                            Issuing organization*
                        </label>

                        <input
                            type="text"
                            value={organize}
                            onChange={(e) => {
                                setOrganize(e.target.value);
                                clearError('organize');
                            }}
                            className="h-[4.07vh] px-1.5 w-full rounded-input border border-brand bg-surface-white/80 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                            placeholder="Ex: Microsoft"
                            required
                        />
                        <FieldError message={errors.organize} />
                    </div>

                    {/* Issue date */}
                    <div>
                        <label className="block type-sm !font-[500]">
                            Issue date
                        </label>
                        <div className="flex gap-2">
                            {/* Month */}
                            <div className="flex-1">
                                <label className="block type-sm font-normal">
                                    Month
                                </label>

                                <MonthDropdown
                                    value={month}
                                    onChange={(value) => {
                                        setMonth(value);
                                        clearError('issueDate');
                                    }}
                                />
                            </div>

                            {/* Year */}
                            <div className="flex-1">
                                <label className="block type-sm font-normal">
                                    Year
                                </label>

                                <YearDropdown
                                    value={year}
                                    onChange={(value) => {
                                        setYear(value);
                                        clearError('issueDate');
                                    }}
                                    minYear={1990}
                                    maxYear={new Date().getFullYear()}
                                />
                            </div>
                        </div>
                        <FieldError message={errors.issueDate} />
                    </div>
                    {/* Expiration date */}
                    <div>
                        <label className="block type-sm !font-[500]">
                            Expiration date
                        </label>
                        <div className="flex gap-2">
                            {/* Month */}
                            <div className="flex-1">
                                <label className="block type-sm font-normal">
                                    Month
                                </label>

                                <MonthDropdown
                                    value={exMonth}
                                    onChange={(value) => {
                                        setExMonth(value);
                                        clearError('expireDate');
                                    }}
                                />
                            </div>

                            {/* Year */}
                            <div className="flex-1">
                                <label className="mb block type-sm font-normal">
                                    Year
                                </label>

                                <YearDropdown
                                    value={exYear}
                                    onChange={(value) => {
                                        setExYear(value);
                                        clearError('expireDate');
                                    }}
                                    minYear={1990}
                                    maxYear={new Date().getFullYear() + 20}
                                />
                            </div>
                        </div>
                        <FieldError message={errors.expireDate} />
                    </div>
                    {/* Credential ID */}
                    <div>
                        <label className="block type-sm font-medium">
                            Credential ID
                        </label>

                        <input
                            type="text"
                            value={credID}
                            onChange={(e) => {
                                setCredID(e.target.value);
                                clearError('credID');
                            }}
                            className="h-[4.07vh] px-1.5 w-full rounded-input border border-brand bg-surface-white/80 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                        <FieldError message={errors.credID} />
                    </div>
                    {/* Credential URL */}
                    <div>
                        <label className="block type-sm font-medium">
                            Credential URL
                        </label>

                        <input
                            type="text"
                            value={credURL}
                            onChange={(e) => {
                                setCredURL(e.target.value);
                                clearError('credURL');
                            }}
                            className="h-[4.07vh] px-1.5 w-full rounded-input border border-brand bg-surface-white/80 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                        <FieldError message={errors.credURL} />
                    </div>
                    <div>
                        <FileUpload
                            onError={(message) =>
                                setErrors((prev) => ({
                                    ...prev,
                                    file: message,
                                }))
                            }
                            value={file}
                            onChange={(next) => {
                                setFile(next);
                                clearError('file');
                            }}
                        />
                        <FieldError message={errors.file} />
                    </div>
                </div>
                <hr className="border-brand-dark/50" />
                {/* -----------------footer----------------- */}
                <FieldError message={formError} />

                {/* Save button */}
                <div className="flex items-center justify-end gap-3 pt-4">
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
