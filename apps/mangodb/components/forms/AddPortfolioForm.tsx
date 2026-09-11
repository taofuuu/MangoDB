'use client';

import { useState } from 'react';
import DateDropdown from '../sm-detail/DateDropdown';
import MonthDropdown from '../sm-detail/MonthDropdown';
import YearDropdown from '../sm-detail/YearDropdown';
import FileUpload from '../sm-detail/FileUpload';
import type { CertificateData } from './EditCertificateForm';
import { apiFetch, ApiRequestError } from '@/lib/api';

type FormModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CertificateData) => void;
};

export default function AddPortfolioForm({
    isOpen,
    onClose,
    onSave,
}: FormModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [date, setDate] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const resetForm = () => {
        setName('');
        setDescription('');
        setUrl('');
        setDate('');
        setMonth('');
        setYear('');
        setFile(null);
    };

    if (!isOpen) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
                className="
                    modal-scrollbar
                    w-full max-w-[45vw]
                    h-[92vh]
                    max-md:h-[90vh]
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
                    <h2 className="text-lg">Add Portfolio</h2>

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
                                placeholder="Ex: 67 Counter Capture Camera"
                                required
                            />
                        </div>
                        {/* Organization */}
                        <div>
                            <label className="block text-sm">Description</label>

                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="h-[9.65vh] w-[40.94vw] px-1.5 w-full rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                required
                            />
                        </div>
                        {/* Link */}
                        <div>
                            <label className="block text-sm font-medium">
                                Link to your portfolio
                            </label>

                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="h-[4.07vh] w-[40.94vw] px-1.5 w-full rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                placeholder="Ex: Website, Github"
                            />
                        </div>

                        {/* Issue date */}
                        <div>
                            <label className="block text-sm !font-[500]">
                                Development date
                            </label>
                            <div className="flex gap-2">
                                {/* Date */}
                                <div className="flex-1">
                                    <label className="block text-sm font-normal">
                                        Date
                                    </label>

                                    <DateDropdown
                                        value={date}
                                        onChange={setDate}
                                    />
                                </div>

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
                        <FileUpload
                            value={file}
                            onChange={setFile}
                            className="
                            my-8
                            upload-box
                            mx-auto
                            flex
                            h-[20.64vh]
                            w-[14.11vw]
                            cursor-pointer
                            flex-col
                            items-center
                            justify-center
                            rounded-lg
                            bg-[#E3F1F1]/40
                            hover:bg-gray-50
                        "
                        />
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
