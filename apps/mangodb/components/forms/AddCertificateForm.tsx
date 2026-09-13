'use client';

import { useCallback, useId, useState } from 'react';
import MonthDropdown from '../sm-detail/MonthDropdown';
import YearDropdown from '../sm-detail/YearDropdown';
import type { CertificateData } from './EditCertificateForm';
import { describeError } from '@/lib/api';
import { createCertificate } from '@/lib/certificate';
import FileUpload from '../sm-detail/FileUpload';
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
    const [error, setError] = useState<string | null>(null);

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
        setError(null);
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

        // Validate expiration date against issue date
        if (year && exYear && month && exMonth) {
            const issueDate = Number(year) * 12 + Number(month);
            const expireDate = Number(exYear) * 12 + Number(exMonth);

            if (expireDate < issueDate) {
                setError('Expiration date cannot be before the issue date.');
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
            setError(describeError(cause));
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
                            onChange={(e) => setName(e.target.value)}
                            className="h-[4.07vh] px-1.5 w-full rounded-input border border-brand bg-surface-white/80 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                            placeholder="Ex: Microsoft certified network associate security"
                            required
                        />
                    </div>
                    {/* Organization */}
                    <div>
                        <label className="block type-sm">
                            Issuing organization*
                        </label>

                        <input
                            type="text"
                            value={organize}
                            onChange={(e) => setOrganize(e.target.value)}
                            className="h-[4.07vh] px-1.5 w-full rounded-input border border-brand bg-surface-white/80 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                            placeholder="Ex: Microsoft"
                            required
                        />
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
                                    onChange={setMonth}
                                />
                            </div>

                            {/* Year */}
                            <div className="flex-1">
                                <label className="block type-sm font-normal">
                                    Year
                                </label>

                                <YearDropdown
                                    value={year}
                                    onChange={setYear}
                                    minYear={1990}
                                    maxYear={new Date().getFullYear()}
                                />
                            </div>
                        </div>
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
                                    onChange={setExMonth}
                                />
                            </div>

                            {/* Year */}
                            <div className="flex-1">
                                <label className="mb block type-sm font-normal">
                                    Year
                                </label>

                                <YearDropdown
                                    value={exYear}
                                    onChange={setExYear}
                                    minYear={1990}
                                    maxYear={new Date().getFullYear() + 20}
                                />
                            </div>
                        </div>
                    </div>
                    {/* Credential ID */}
                    <div>
                        <label className="block type-sm font-medium">
                            Credential ID
                        </label>

                        <input
                            type="text"
                            value={credID}
                            onChange={(e) => setCredID(e.target.value)}
                            className="h-[4.07vh] px-1.5 w-full rounded-input border border-brand bg-surface-white/80 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                    </div>
                    {/* Credential URL */}
                    <div>
                        <label className="block type-sm font-medium">
                            Credential URL
                        </label>

                        <input
                            type="text"
                            value={credURL}
                            onChange={(e) => setCredURL(e.target.value)}
                            className="h-[4.07vh] px-1.5 w-full rounded-input border border-brand bg-surface-white/80 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                    </div>
                    <FileUpload
                        onError={setError}
                        value={file}
                        onChange={setFile}
                    />
                </div>
                <hr className="border-brand-dark/50" />
                {/* -----------------footer----------------- */}
                {error && (
                    <p
                        role="alert"
                        className="pt-4 text-right type-sm text-danger-2"
                    >
                        {error}
                    </p>
                )}

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
