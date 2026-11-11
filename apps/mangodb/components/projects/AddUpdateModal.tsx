'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import ModalShell from '@/components/ui/ModalShell';

type AddUpdateModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (updateText: string) => Promise<void>;
    projectName?: string;
    receiverName?: string;
};

type ModalStep = 'form' | 'confirm' | 'success';

export default function AddUpdateModal({
    isOpen,
    onClose,
    onSubmit,
    projectName,
    receiverName,
}: AddUpdateModalProps) {
    const [step, setStep] = useState<ModalStep>('form');
    const [updateText, setUpdateText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const displayProjectName = projectName?.trim() || 'this project';
    const displayReceiverName = receiverName?.trim() || 'Receiver';

    const handleClose = () => {
        if (isSubmitting) return;
        setStep('form');
        setUpdateText('');
        setError(null);
        onClose();
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = updateText.trim();
        if (!trimmed) {
            setError('Please enter a description.');
            return;
        }
        setError(null);
        setStep('confirm');
    };

    const handleConfirm = async () => {
        const trimmed = updateText.trim();
        if (!trimmed) {
            setError('Please enter a description.');
            setStep('form');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmit(trimmed);
            setStep('success');
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : 'Failed to add update',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={handleClose}
            isBusy={isSubmitting}
            labelledBy={
                step === 'form'
                    ? 'add-update-title'
                    : step === 'confirm'
                      ? 'confirm-update-title'
                      : 'success-update-title'
            }
            panelClassName={`w-full bg-surface p-7 shadow-xl rounded-[24px] ${
                step === 'success' ? 'max-w-[460px]' : 'max-w-[560px]'
            }`}
        >
            {step === 'form' && (
                <form onSubmit={handleSave} className="flex flex-col">
                    <div className="flex items-center justify-between">
                        <h2
                            id="add-update-title"
                            className="type-md !font-[700] text-ink"
                        >
                            Add Update
                        </h2>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="text-ink-soft transition-colors hover:text-ink focus-visible:outline-none"
                            aria-label="Close"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    <hr className="my-4 border-t border-line" />

                    <p className="type-sm leading-normal text-ink">
                        Add an update to{' '}
                        <strong className="font-bold text-ink">
                            {displayProjectName}
                        </strong>{' '}
                        so the receiver can track the project&apos;s progress.
                    </p>

                    <p className="mt-3 mb-4 type-xs text-ink-soft">
                        * Indicates required
                    </p>

                    <div className="flex flex-col">
                        <label
                            htmlFor="update-description"
                            className="mb-1.5 block type-sm !font-[500] text-ink"
                        >
                            Description *
                        </label>
                        <textarea
                            id="update-description"
                            rows={5}
                            maxLength={10000}
                            value={updateText}
                            onChange={(e) => {
                                setUpdateText(e.target.value);
                                if (error) setError(null);
                            }}
                            className={`block w-full resize-none rounded-lg border-2 bg-surface-white p-3 type-sm text-ink placeholder:text-ink-placeholder transition-colors focus:outline-none ${
                                error
                                    ? 'border-danger focus:border-danger'
                                    : 'border-focus focus:border-focus'
                            }`}
                        />
                        {error && (
                            <p
                                role="alert"
                                className="mt-1.5 type-xs text-danger"
                            >
                                {error}
                            </p>
                        )}
                    </div>

                    <hr className="my-4 border-t border-line" />

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="rounded-[10px] bg-brand px-6 py-2 type-sm !font-[600] text-surface-white shadow-xs transition-colors hover:bg-brand-dark focus-visible:outline-none"
                        >
                            Save
                        </button>
                    </div>
                </form>
            )}

            {step === 'confirm' && (
                <div className="flex flex-col">
                    <h2
                        id="confirm-update-title"
                        className="type-md !font-[700] text-ink"
                    >
                        Confirm Your Update Statement
                    </h2>

                    <hr className="my-4 border-t border-line" />

                    <div className="grid grid-cols-[85px_1fr] gap-y-2.5 type-sm">
                        <span className="font-medium text-brand">Project</span>
                        <span className="font-bold text-ink">
                            {displayProjectName}
                        </span>
                        <span className="font-medium text-brand">Receiver</span>
                        <span className="text-ink">{displayReceiverName}</span>
                    </div>

                    <div className="my-5 max-h-[40vh] overflow-y-auto whitespace-pre-wrap break-words type-sm leading-relaxed text-ink">
                        {updateText.trim()}
                    </div>

                    {error && (
                        <p role="alert" className="mb-3 type-xs text-danger">
                            {error}
                        </p>
                    )}

                    <hr className="my-4 border-t border-line" />

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setStep('form')}
                            disabled={isSubmitting}
                            className="rounded-[10px] bg-fill-muted px-6 py-2 type-sm !font-[600] text-ink-soft shadow-xs transition-colors hover:bg-line focus-visible:outline-none disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isSubmitting}
                            className="rounded-[10px] bg-brand px-6 py-2 type-sm !font-[600] text-surface-white shadow-xs transition-colors hover:bg-brand-dark focus-visible:outline-none disabled:opacity-50"
                        >
                            {isSubmitting ? 'Confirming...' : 'Confirm'}
                        </button>
                    </div>
                </div>
            )}

            {step === 'success' && (
                <div className="flex flex-col">
                    <div className="flex items-center gap-4">
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-full border-[3px] border-brand">
                            <svg
                                className="size-7 text-brand"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <h3
                            id="success-update-title"
                            className="type-md !font-[700] text-ink"
                        >
                            Update Added Successfully
                        </h3>
                    </div>

                    <hr className="my-5 border-t border-line" />

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-[10px] bg-brand px-6 py-2 type-sm !font-[600] text-surface-white shadow-xs transition-colors hover:bg-brand-dark focus-visible:outline-none"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </ModalShell>
    );
}
