'use client';

import { useState } from 'react';
import MonthDropdown from '../sm-detail/MonthDropdown';
import YearDropdown from '../sm-detail/YearDropdown';
import FileUpload from '../sm-detail/FileUpload';
import type { CertificateData } from './EditCertificateForm';
import { apiFetch, ApiRequestError } from '@/lib/api';

type CertificateResponse = {
    certificate_id: number;
    provider_id: number;
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

        try {
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

            if (file) {
                formData.append('cert_image', file);
            }

            const result = await apiFetch<CertificateResponse>(
                '/certificates',
                {
                    method: 'POST',
                    body: formData,
                },
            );

            console.log('Certificate created:', result);

            const newData: CertificateData = {
                name: result.cert_title,
                organize: result.organization,
                month: result.issue_month?.toString() ?? '',
                year: result.issue_year?.toString() ?? '',
                exMonth: result.expire_month?.toString() ?? '',
                exYear: result.expire_year?.toString() ?? '',
                credID: result.credential_id ?? '',
                credURL: result.credential_url ?? '',
                file,
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
