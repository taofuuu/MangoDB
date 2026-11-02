'use client';

import { useId, useState } from 'react';
import { X } from 'lucide-react';
import ModalShell from '@/components/ui/ModalShell';
import { validateWorkRejectionReason } from '@/lib/validation/project';

type RejectWorkModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => Promise<void>;
};

export default function RejectWorkModal({
    isOpen,
    onClose,
    onSubmit,
}: RejectWorkModalProps) {
    const titleId = useId();
    const descriptionId = useId();
    const reasonErrorId = useId();
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const requestClose = () => {
        if (isSubmitting) return;
        setReason('');
        setError(null);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationError = validateWorkRejectionReason(reason);
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmit(reason.trim());
            requestClose();
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : 'Failed to reject work',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={requestClose}
            isBusy={isSubmitting}
            role="alertdialog"
            labelledBy={titleId}
            describedBy={descriptionId}
            panelClassName="w-full max-w-[440px] rounded-[20px] bg-surface p-6 shadow-xl"
        >
            <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="flex items-start gap-4">
                    <X
                        aria-hidden="true"
                        className="mt-1 size-8 shrink-0 text-danger stroke-[2.5]"
                    />
                    <div>
                        <h2
                            id={titleId}
                            className="type-md !font-[600] text-ink"
                        >
                            Reject this delivered work?
                        </h2>
                        <p
                            id={descriptionId}
                            className="mt-2 type-xs leading-relaxed text-ink"
                        >
                            Tell the Provider what needs to change. Once you
                            reject the work, the project goes back to In
                            Progress so they can revise it.
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-1.5">
                    <label htmlFor="reject-reason" className="type-xs text-ink">
                        Reason*
                    </label>
                    <textarea
                        id="reject-reason"
                        rows={5}
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            if (error) setError(null);
                        }}
                        placeholder="e.g. The login page doesn't match the agreed design."
                        className="min-h-28 w-full resize-y rounded-input border border-line bg-surface-white p-3 type-sm text-ink placeholder:text-ink-placeholder focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand aria-[invalid=true]:border-danger aria-[invalid=true]:focus:border-danger aria-[invalid=true]:focus:ring-danger"
                        maxLength={10000}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? reasonErrorId : undefined}
                    />
                    {error && (
                        <p
                            id={reasonErrorId}
                            role="alert"
                            className="type-xs text-danger"
                        >
                            {error}
                        </p>
                    )}
                </div>

                <div className="mt-3 flex items-center justify-end gap-3 border-t border-line pt-3">
                    <button
                        type="button"
                        onClick={requestClose}
                        disabled={isSubmitting}
                        className="h-9 rounded-button bg-fill-muted px-5 type-xs !font-[600] text-ink-soft transition-colors hover:bg-line disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Go Back
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-9 rounded-button bg-danger px-5 type-xs !font-[600] text-surface-white transition-colors hover:bg-danger-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? 'Rejecting...' : 'Reject work'}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
