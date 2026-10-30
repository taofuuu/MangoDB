'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import ModalShell from '@/components/ui/ModalShell';

type UploadQuotationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (file: File) => Promise<void>;
};

export default function UploadQuotationModal({
    isOpen,
    onClose,
    onSubmit,
}: UploadQuotationModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            setError('Please select a PDF file.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('File size must not exceed 5 MB.');
            return;
        }

        setError(null);
        setSelectedFile(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            setError('Please choose a quotation PDF first.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmit(selectedFile);
            setSelectedFile(null);
            onClose();
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to upload quotation',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (isSubmitting) return;
        setSelectedFile(null);
        setError(null);
        onClose();
    };

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={handleClose}
            isBusy={isSubmitting}
            panelClassName="w-full max-w-lg rounded-popup bg-surface-white p-6 shadow-xl border border-line"
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <h3 className="type-lg !font-[700] text-ink">
                        Upload Quotation
                    </h3>
                    <p className="type-xs text-ink-soft mt-1">
                        Upload the quotation PDF (max 5 MB) for the client to
                        review and accept.
                    </p>
                </div>

                {error && (
                    <div className="rounded-input bg-danger/10 p-3 type-sm text-danger border border-danger/20">
                        {error}
                    </div>
                )}

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-button border-2 border-dashed border-line p-6 hover:border-brand cursor-pointer bg-surface transition-colors"
                >
                    <Upload className="h-8 w-8 text-brand mb-2" />
                    <span className="type-sm font-semibold text-ink">
                        {selectedFile ? selectedFile.name : 'Choose a PDF file'}
                    </span>
                    <span className="type-xs text-ink-soft mt-1">
                        {selectedFile
                            ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                            : 'Click to browse files (PDF only)'}
                    </span>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                <div className="mt-2 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="rounded-button border border-line px-4 py-2 type-sm font-semibold text-ink hover:bg-fill-subtle transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !selectedFile}
                        className="rounded-button bg-brand px-5 py-2 type-sm font-semibold text-surface-white hover:bg-brand-dark transition-colors disabled:opacity-50 shadow-xs"
                    >
                        {isSubmitting ? 'Uploading...' : 'Upload Quotation'}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
