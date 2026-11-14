'use client';

import { type ReactNode, useRef } from 'react';
import Image from 'next/image';
import upload from '../../assets/icons/upload-icon.png';

// The same rules src/middleware/upload.ts enforces on the server. Checking
// here too is not security — the server's check is — it is so the user finds
// out before waiting for an upload to be rejected.
//
// Images are not image/*: image/svg+xml is a document the browser executes
// scripts from when its public URL is opened directly. PDFs are for
// quotations (ADR 0017).
const FILE_RULES = {
    image: {
        types: ['image/png', 'image/jpeg', 'image/webp'],
        typeError: 'Only PNG, JPEG or WebP images are allowed.',
        sizeError: 'Image must be 5MB or smaller.',
    },
    pdf: {
        types: ['application/pdf'],
        typeError: 'Only PDF files are allowed.',
        sizeError: 'PDF must be 5MB or smaller.',
    },
} as const;
const MAX_BYTES = 5 * 1024 * 1024;

type FileUploadProps = {
    value: File | null;
    onChange: (file: File | null) => void;
    // Called instead of onChange when the file breaks a rule above, so the
    // caller shows the message wherever it shows its other errors.
    onError?: (message: string) => void;
    className?: string;
    // Which rules above the picked file must pass. Also sets what the
    // browser's file dialog offers.
    kind?: keyof typeof FILE_RULES;
    label?: string;
    // Replaces the default icon and label inside the button, for a picker
    // that looks different but keeps the same rules.
    children?: ReactNode;
};

export default function FileUpload({
    value,
    onChange,
    onError,
    className = '',
    kind = 'image',
    label = 'Upload',
    children,
}: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const rules = FILE_RULES[kind];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;

        if (file && !(rules.types as readonly string[]).includes(file.type)) {
            onError?.(rules.typeError);
            // Clear the input, or picking the same bad file again fires no
            // change event and the user sees nothing happen.
            e.target.value = '';
            return;
        }

        if (file && file.size > MAX_BYTES) {
            onError?.(rules.sizeError);
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
                accept={rules.types.join(',')}
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Upload block */}
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={className || defaultClassName}
            >
                {children ?? (
                    <>
                        <Image
                            src={upload}
                            alt="Upload"
                            width={24}
                            height={24}
                            className="ml-1 mt-2"
                        />

                        <span className="mt-2 max-w-full truncate px-2 type-sm !font-[500] underline">
                            {value?.name ?? label}
                        </span>
                    </>
                )}
            </button>
        </div>
    );
}
