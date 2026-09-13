'use client';

import { useState } from 'react';
import MonthDropdown from '../sm-detail/MonthDropdown';
import YearDropdown from '../sm-detail/YearDropdown';
import type { CertificateData } from './EditCertificateForm';
import type { Certificate } from '@mangodb/shared';
import { apiFetch, ApiRequestError } from '@/lib/api';
import FileUpload from '../sm-detail/FileUpload';

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
    };

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
                alert('Expiration date cannot be before the issue date');
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

            // The bare resource, not { message, certificate } — see
            // docs/conventions.md section 3. The status code says it worked.
            const cert = await apiFetch<Certificate>('/certificates', {
                method: 'POST',
                body: formData,
            });

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
        } catch (error) {
            console.error('Error creating certificate:', error);

            if (error instanceof ApiRequestError) {
                console.error('Status:', error.status);
                console.error('Message:', error.message);
                console.error('Details:', error.details);

                if (error.details.length > 0) {
                    const errorMessages = error.details
                        .map((detail) => detail.message)
                        .join('\n');

                    alert(errorMessages);
                } else {
                    alert(error.message);
                }
            } else {
                alert('Unable to connect to the server.');
            }
        }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
                className="
                    modal-scrollbar
                    w-full max-w-[45vw]
                    h-[92vh]
                    max-h-[calc(100vh-2rem)]
                    rounded-xl
                    bg-[#FFFDF9]
                    p-[1.5vw]
                    text-[#171717]
                    shadow-xl   
                    overflow-y-auto
                "
            >
                {/* -------------header----------------- */}
                <div className=" flex items-center justify-between">
                    <h2 className="text-lg">Add license or certification</h2>

                    <button
                        type="button"
                        onClick={() => {
                            resetForm();
                            onClose();
                        }}
                        className="text-[#828282] hover:text-gray-800"
                    >
                        X
                    </button>
                </div>

                {/* ----------------element-1----------------- */}
                <hr className="border-[#3F6B80]/50" />
                <div>
                    <label className="my-2 block text-sm !text-[12px]">
                        *Indicates required
                    </label>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        {/* Name */}
                        <div>
                            <label className="block text-sm">Name*</label>

                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-[4.07vh] w-[40.94vw] px-1.5 w-full rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                placeholder="Ex: Microsoft certified network associate security"
                                required
                            />
                        </div>
                        {/* Organization */}
                        <div>
                            <label className="block text-sm">
                                Issuing organization*
                            </label>

                            <input
                                type="text"
                                value={organize}
                                onChange={(e) => setOrganize(e.target.value)}
                                className="h-[4.07vh] w-[40.94vw] px-1.5 w-full rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                placeholder="Ex: Microsoft"
                                required
                            />
                        </div>

                        {/* Issue date */}
                        <div>
                            <label className="block text-sm !font-[500]">
                                Issue date
                            </label>
                            <div className="flex gap-2">
                                {/* Month */}
                                <div className="flex-1">
                                    <label className="block text-sm font-normal">
                                        Month
                                    </label>

                                    <MonthDropdown
                                        value={month}
                                        onChange={setMonth}
                                    />
                                </div>

                                {/* Year */}
                                <div className="flex-1">
                                    <label className="block text-sm font-normal">
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
                            <label className="block text-sm !font-[500]">
                                Expiration date
                            </label>
                            <div className="flex gap-2">
                                {/* Month */}
                                <div className="flex-1">
                                    <label className="block text-sm font-normal">
                                        Month
                                    </label>

                                    <MonthDropdown
                                        value={exMonth}
                                        onChange={setExMonth}
                                    />
                                </div>

                                {/* Year */}
                                <div className="flex-1">
                                    <label className="mb block text-sm font-normal">
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
                            <label className="block text-sm font-medium">
                                Credential ID
                            </label>

                            <input
                                type="text"
                                value={credID}
                                onChange={(e) => setCredID(e.target.value)}
                                className="h-[4.07vh] w-[40.94vw] px-1.5 w-full rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                            />
                        </div>
                        {/* Credential URL */}
                        <div>
                            <label className="block text-sm font-medium">
                                Credential URL
                            </label>

                            <input
                                type="text"
                                value={credURL}
                                onChange={(e) => setCredURL(e.target.value)}
                                className="h-[4.07vh] w-[40.94vw] px-1.5 w-full rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                            />
                        </div>
                        <FileUpload value={file} onChange={setFile} />
                    </div>
                    <hr className="border-[#3F6B80]/50" />
                    {/* -----------------footer----------------- */}
                    {/* Save button */}
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button
                            type="submit"
                            className="h-[4vh] w-[7vw] rounded-status bg-[#3F6B80] text-sm font-[500] text-[#FFFDF9] transition-colors hover:bg-[#497B93]"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
