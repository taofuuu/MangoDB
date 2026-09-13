'use client';

import { useRef } from 'react';
import Image from 'next/image';
import upload from '../../assets/icons/upload-icon.png';

// The same rules src/middleware/upload.ts enforces on the server. Checking
// here too is not security — the server's check is — it is so the user finds
// out before waiting for an upload to be rejected.
//
// Not image/*: image/svg+xml is a document the browser executes scripts from
// when its public URL is opened directly.
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

type FileUploadProps = {
    value: File | null;
    onChange: (file: File | null) => void;
    // Called instead of onChange when the file breaks a rule above, so the
    // caller shows the message wherever it shows its other errors.
    onError?: (message: string) => void;
    className?: string;
    accept?: string;
    label?: string;
};

export default function FileUpload({
    value,
    onChange,
    onError,
    className = '',
    // Matches IMAGE_TYPES. The old default offered .pdf, which the API refuses.
    accept = 'image/png,image/jpeg,image/webp',
    label = 'Upload',
}: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;

        if (file && !IMAGE_TYPES.includes(file.type)) {
            onError?.('Only PNG, JPEG or WebP images are allowed.');
            // Clear the input, or picking the same bad file again fires no
            // change event and the user sees nothing happen.
            e.target.value = '';
            return;
        }

        if (file && file.size > MAX_BYTES) {
            onError?.('Image must be 5MB or smaller.');
            e.target.value = '';
            return;
        }

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
