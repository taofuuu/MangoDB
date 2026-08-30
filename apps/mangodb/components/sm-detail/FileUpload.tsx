'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import upload from '../../assets/icons/upload-icon.png';

type FileUploadProps = {
    value: File | null;
    onChange: (file: File | null) => void;
};

export default function FileUpload({ value, onChange }: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        onChange(file);
    };

    return (
        <div>
            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Upload block */}
            <div
                onClick={() => inputRef.current?.click()}
                className="mb-4 my-4 upload-box mx-auto flex h-[80px] w-[100px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#3F6B80]/90 bg-[#E3F1F1]/40 hover:bg-gray-50"
            >
                <Image
                    src={upload}
                    alt="Upload"
                    width={24}
                    height={24}
                    className="ml-1 mt-2"
                />

                <p className="mt-2 text-sm font-medium underline">Upload</p>
            </div>
        </div>
    );
}
