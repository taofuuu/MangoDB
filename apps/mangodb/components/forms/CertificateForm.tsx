'use client';

import { useState } from 'react';
import MonthDropdown from '../sm-detail/MonthDropdown';
import YearDropdown from '../sm-detail/YearDropdown';
import FileUpload from '../sm-detail/FileUpload';

type FormModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function FormModal({ isOpen, onClose }: FormModalProps) {
    const [name, setName] = useState('');
    const [organize, setOrganize] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    const [exMonth, setExMonth] = useState('');
    const [exYear, setExYear] = useState('');
    const [credID, setCredID] = useState('');
    const [credURL, setCredURL] = useState('');
    const [file, setFile] = useState<File | null>(null);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        console.log({
            name,
            organize,
            month,
            year,
            credID,
            credURL,
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-[45vw] max-h-[92vh] rounded-xl bg-[#FFFDF9] p-[1.5vw] shadow-xl">
                {/* -------------header----------------- */}
                <div className=" flex items-center justify-between">
                    <h2 className="text-lg">Add license or certification</h2>

                    <button
                        type="button"
                        onClick={onClose}
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
                                className="h-[4.07vh] w-[40.94vw] px-1.5 w-full rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
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
                                className="h-[4.07vh] w-[40.94vw] px-1.5 w-full rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                placeholder="Ex: Microsoft"
                                required
                            />
                        </div>

                        {/* Issue date */}
                        <form>
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
                        </form>
                        {/* Expiration date */}
                        <form>
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
                        </form>
                        {/* Credential ID */}
                        <div>
                            <label className="block text-sm font-medium">
                                Credential ID
                            </label>

                            <input
                                type="text"
                                value={credID}
                                onChange={(e) => setCredID(e.target.value)}
                                className="h-[4.07vh] w-[40.94vw] px-1.5 w-full rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
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
                                className="h-[4.07vh] w-[40.94vw] px-1.5 w-full rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                required
                            />
                        </div>
                        <FileUpload value={file} onChange={setFile} />
                    </div>
                </form>
                <hr className="border-[#3F6B80]/50" />
                {/* -----------------footer----------------- */}
                {/* save button */}
                <div className="flex justify-end item-center gap-3 pt-4">
                    <button
                        type="submit"
                        className="rounded-status bg-[#3F6B80] w-[7vw] h-[4vh] text-[#FFFDF9] text-sm !font-[500]"
                    >
                        save
                    </button>
                </div>
            </div>
        </div>
    );
}
