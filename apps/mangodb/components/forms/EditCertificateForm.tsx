'use client';

import { useState } from 'react';
import MonthDropdown from '../sm-detail/MonthDropdown';
import YearDropdown from '../sm-detail/YearDropdown';
import FileUpload from '../sm-detail/FileUpload';

export type CertificateData = {
    name?: string;
    organize?: string;
    month?: string;
    year?: string;
    exMonth?: string;
    exYear?: string;
    credID?: string;
    credURL?: string;
    file?: File | null;
};

type EditFormModalProps = {
    isOpen: boolean;
    onClose: () => void;
    initialData?: CertificateData | undefined;
    onSave?: (data: CertificateData) => void;
};

export default function EditCertificateForm({
    isOpen,
    onClose,
    initialData,
    onSave,
}: EditFormModalProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [organize, setOrganize] = useState(initialData?.organize || '');
    const [month, setMonth] = useState(initialData?.month || '');
    const [year, setYear] = useState(initialData?.year || '');
    const [exMonth, setExMonth] = useState(initialData?.exMonth || '');
    const [exYear, setExYear] = useState(initialData?.exYear || '');
    const [credID, setCredID] = useState(initialData?.credID || '');
    const [credURL, setCredURL] = useState(initialData?.credURL || '');
    const [file, setFile] = useState<File | null>(initialData?.file || null);

    // Sync form state when the modal opens with initialData. Adjusted during
    // render rather than in an effect: an effect would paint the previous
    // certificate's values once before correcting them.
    const [lastOpened, setLastOpened] = useState({ isOpen, initialData });
    if (
        lastOpened.isOpen !== isOpen ||
        lastOpened.initialData !== initialData
    ) {
        setLastOpened({ isOpen, initialData });
        if (isOpen && initialData) {
            setName(initialData.name || '');
            setOrganize(initialData.organize || '');
            setMonth(initialData.month || '');
            setYear(initialData.year || '');
            setExMonth(initialData.exMonth || '');
            setExYear(initialData.exYear || '');
            setCredID(initialData.credID || '');
            setCredURL(initialData.credURL || '');
            setFile(initialData.file || null);
        }
    }

    if (!isOpen) {
        return null;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const updatedData: CertificateData = {
            name,
            organize,
            month,
            year,
            exMonth,
            exYear,
            credID,
            credURL,
            file,
        };

        if (onSave) {
            onSave(updatedData);
        }

        console.log('Updated Certificate:', updatedData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
                className="modal-scrollbar w-full max-w-[45vw] rounded-xl bg-[#FFFDF9] p-[1.5vw] text-[#171717] shadow-xl
                    max-h-[calc(100vh-2rem)] overflow-y-auto"
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
                <form onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        {/* Name */}
                        <div>
                            <label className="block text-sm">Name*</label>

                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-[4.07vh] w-full px-1.5 rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
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
                                className="h-[4.07vh] w-full px-1.5 rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
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
                                    <label className="block text-sm font-normal">
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
                                className="h-[4.07vh] w-full px-1.5 rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                required
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
                                className="h-[4.07vh] w-full px-1.5 rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                required
                            />
                        </div>
                        <FileUpload value={file} onChange={setFile} />
                    </div>

                    <hr className="border-[#3F6B80]/50 my-2" />
                    {/* -----------------footer----------------- */}
                    <div className="flex justify-end items-center gap-3 pt-2">
                        <button
                            type="submit"
                            className="rounded-status bg-[#3F6B80] w-[7vw] h-[4vh] text-[#FFFDF9] text-sm !font-[500] hover:bg-[#34596b] transition-colors"
                        >
                            save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
