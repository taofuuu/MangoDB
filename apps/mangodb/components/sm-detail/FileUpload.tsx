'use client';

import { useRef } from 'react';
import Image from 'next/image';
import upload from '../../assets/icons/upload-icon.png';

type FileUploadProps = {
    value: File | null;
    onChange: (file: File | null) => void;
    className?: string;
    accept?: string;
    label?: string;
};

export default function FileUpload({
    value,
    onChange,
    className = '',
    accept = '.pdf,.jpg,.jpeg,.png',
    label = 'Upload',
}: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        onChange(file);
    };

    const defaultClassName =
        'mb-4 my-4 upload-box mx-auto flex h-[80px] w-[100px] cursor-pointer items-center justify-center';

    return (
        <div>
            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Upload block */}
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={className || defaultClassName}
            >
                <Image
                    src={upload}
                    alt="Upload"
                    width={24}
                    height={24}
                    className="ml-1 mt-2"
                />

                <span className="mt-2 max-w-full truncate px-2 text-sm !font-[500] underline">
                    {value?.name ?? label}
                </span>
            </button>
        </div>
    );
}
