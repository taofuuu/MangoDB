'use client';

import { useState } from 'react';
import MonthDropdown from '../sm-detail/MonthDropdown';
import YearDropdown from '../sm-detail/YearDropdown';
import { apiFetch, ApiRequestError } from '@/lib/api';
import FileUpload from '../sm-detail/FileUpload';

export type CertificateData = {
    id?: number;
    name?: string;
    organize?: string;
    month?: string;
    year?: string;
    exMonth?: string;
    exYear?: string;
    credID?: string;
    credURL?: string;
    file?: File | null;
    cert_image?: string | null;
};

type EditFormModalProps = {
    isOpen: boolean;
    onClose: () => void;
    initialData?: CertificateData | null | undefined;
    onSave?: ((data: CertificateData) => void | Promise<void>) | undefined;
};

const MONTH_MAP: Record<string, string> = {
    january: '1',
    february: '2',
    march: '3',
    april: '4',
    may: '5',
    june: '6',
    july: '7',
    august: '8',
    september: '9',
    october: '10',
    november: '11',
    december: '12',
    jan: '1',
    feb: '2',
    mar: '3',
    apr: '4',
    jun: '6',
    jul: '7',
    aug: '8',
    sep: '9',
    oct: '10',
    nov: '11',
    dec: '12',
};

function normalizeMonth(value?: string | number | null): string {
    if (!value) return '';
    const trimmed = String(value).trim();
    if (/^\d+$/.test(trimmed)) return trimmed;
    return MONTH_MAP[trimmed.toLowerCase()] ?? trimmed;
}

export default function EditCertificateForm({
    isOpen,
    ...props
}: EditFormModalProps) {
    if (!isOpen) return null;
    return (
        <EditCertificateDialog
            key={props.initialData?.id ?? 'edit-cert'}
            {...props}
        />
    );
}

function EditCertificateDialog({
    onClose,
    initialData,
    onSave,
}: Omit<EditFormModalProps, 'isOpen'>) {
    const [name, setName] = useState(initialData?.name || '');
    const [organize, setOrganize] = useState(initialData?.organize || '');
    const [month, setMonth] = useState(normalizeMonth(initialData?.month));
    const [year, setYear] = useState(initialData?.year || '');
    const [exMonth, setExMonth] = useState(
        normalizeMonth(initialData?.exMonth),
    );
    const [exYear, setExYear] = useState(initialData?.exYear || '');
    const [credID, setCredID] = useState(initialData?.credID || '');
    const [credURL, setCredURL] = useState(initialData?.credURL || '');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Date validation: expiration date cannot be before issue date
        if (year && month && exYear && exMonth) {
            const issueDate = Number(year) * 100 + Number(month);
            const expireDate = Number(exYear) * 100 + Number(exMonth);
            if (expireDate < issueDate) {
                setError('Expiration date cannot be before the issue date');
                return;
            }
        }

        setIsSubmitting(true);

        const updatedData: CertificateData = {
            ...(initialData?.id !== undefined && { id: initialData.id }),
            name,
            organize,
            month,
            year,
            exMonth,
            exYear,
            credID,
            credURL,
            cert_image: initialData?.cert_image ?? null,
        };
        try {
            if (initialData?.id) {
                const formData = new FormData();

                formData.append('cert_title', name);
                formData.append('organization', organize);

                if (month) {
                    formData.append('issue_month', month);
                }

                if (year) {
                    formData.append('issue_year', year);
                }

                if (exMonth) {
                    formData.append('expire_month', exMonth);
                }

                if (exYear) {
                    formData.append('expire_year', exYear);
                }

                if (credID) {
                    formData.append('credential_id', credID);
                }

                if (credURL) {
                    formData.append('credential_url', credURL);
                }

                // Only send cert_image when user selected a new file
                if (file) {
                    formData.append('cert_image', file);
                }

                const res = await apiFetch<{
                    message: string;
                    certificate?: {
                        certificate_id: number;
                        cert_title: string;
                        organization: string;
                        issue_month: number | null;
                        issue_year: number | null;
                        expire_month: number | null;
                        expire_year: number | null;
                        credential_id: string | null;
                        credential_url: string | null;
                        cert_image: string | null;
                    };
                }>(`/certificates/${initialData.id}`, {
                    method: 'PATCH',
                    body: formData,
                });

                const cert = res?.certificate;
                if (cert) {
                    updatedData.name = cert.cert_title;
                    updatedData.organize = cert.organization;
                    updatedData.month = cert.issue_month?.toString() ?? '';
                    updatedData.year = cert.issue_year?.toString() ?? '';
                    updatedData.exMonth = cert.expire_month?.toString() ?? '';
                    updatedData.exYear = cert.expire_year?.toString() ?? '';
                    updatedData.credID = cert.credential_id ?? '';
                    updatedData.credURL = cert.credential_url ?? '';
                    updatedData.cert_image = cert.cert_image;
                }
            }

            if (onSave) {
                await onSave(updatedData);
            }

            onClose();
        } catch (err: unknown) {
            console.error('Error updating certificate:', err);
            if (err instanceof ApiRequestError) {
                if (err.details && err.details.length > 0) {
                    setError(err.details.map((d) => d.message).join('\n'));
                } else {
                    setError(err.message);
                }
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to update certificate. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div
                className="modal-scrollbar w-full max-w-[45vw] rounded-xl bg-[#FFFDF9] p-[1.5vw] text-[#171717] shadow-xl
                    max-h-[calc(100vh-2rem)] overflow-y-auto max-md:max-w-[90vw]"
            >
                {/* -------------header----------------- */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                        Edit license or certification
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[#828282] hover:text-gray-800"
                    >
                        ✕
                    </button>
                </div>

                {/* ----------------element-1----------------- */}
                <hr className="border-[#3F6B80]/50 my-2" />
                <div>
                    <label className="my-2 block text-sm !text-[12px]">
                        *Indicates required
                    </label>
                </div>

                {error && (
                    <div className="mb-3 rounded-lg bg-red-50 p-2.5 text-xs text-[#C5483E] whitespace-pre-line border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="space-y-3">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium">
                                Name*
                            </label>

                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-[4.07vh] w-full px-2.5 rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                placeholder="Ex: Microsoft certified network associate security"
                                required
                            />
                        </div>
                        {/* Organization */}
                        <div>
                            <label className="block text-sm font-medium">
                                Issuing organization*
                            </label>

                            <input
                                type="text"
                                value={organize}
                                onChange={(e) => setOrganize(e.target.value)}
                                className="h-[4.07vh] w-full px-2.5 rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                placeholder="Ex: Microsoft"
                                required
                            />
                        </div>

                        {/* Issue date */}
                        <div>
                            <label className="block text-sm font-medium">
                                Issue date
                            </label>
                            <div className="flex gap-2">
                                {/* Month */}
                                <div className="flex-1">
                                    <label className="block text-xs text-[#757575] mb-1 font-normal">
                                        Month
                                    </label>

                                    <MonthDropdown
                                        value={month}
                                        onChange={setMonth}
                                    />
                                </div>

                                {/* Year */}
                                <div className="flex-1">
                                    <label className="block text-xs text-[#757575] mb-1 font-normal">
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
                            <label className="block text-sm font-medium">
                                Expiration date
                            </label>
                            <div className="flex gap-2">
                                {/* Month */}
                                <div className="flex-1">
                                    <label className="block text-xs text-[#757575] mb-1 font-normal">
                                        Month
                                    </label>

                                    <MonthDropdown
                                        value={exMonth}
                                        onChange={setExMonth}
                                    />
                                </div>

                                {/* Year */}
                                <div className="flex-1">
                                    <label className="block text-xs text-[#757575] mb-1 font-normal">
                                        Year
                                    </label>

                                    <YearDropdown
                                        value={exYear}
                                        onChange={setExYear}
                                        minYear={new Date().getFullYear()}
                                        maxYear={new Date().getFullYear() + 20}
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Credential ID */}
                        <div>
                            <label className="block text-sm font-medium">
                                Credential ID
                            </label>

                            <input
                                type="text"
                                value={credID}
                                onChange={(e) => setCredID(e.target.value)}
                                className="h-[4.07vh] w-full px-2.5 rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                placeholder="Ex: AZ-900-123456"
                            />
                        </div>
                        {/* Credential URL */}
                        <div>
                            <label className="block text-sm font-medium">
                                Credential URL
                            </label>

                            <input
                                type="url"
                                value={credURL}
                                onChange={(e) => setCredURL(e.target.value)}
                                className="h-[4.07vh] w-full px-2.5 rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                placeholder="https://learn.microsoft.com/..."
                            />
                        </div>
                        {initialData?.cert_image && !file && (
                            <div className="mt-2">
                                <p className="mb-1 text-sm">
                                    Current certificate image
                                </p>

                                <img
                                    src={initialData.cert_image}
                                    alt="Current certificate"
                                    className="h-32 w-48 rounded-lg border border-[#497B93] object-contain"
                                />
                            </div>
                        )}
                        <FileUpload value={file} onChange={setFile} />
                    </div>

                    <hr className="border-[#3F6B80]/50 my-4" />
                    {/* -----------------footer----------------- */}
                    <div className="flex justify-end items-center gap-3 pt-1">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-status bg-[#3F6B80] px-6 h-[4vh] text-[#FFFDF9] text-sm font-medium hover:bg-[#34596b] transition-colors disabled:opacity-50 min-w-[80px]"
                        >
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
