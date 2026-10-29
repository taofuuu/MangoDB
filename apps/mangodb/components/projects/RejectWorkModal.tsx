'use client';

import { useState } from 'react';
import ModalShell from '@/components/ui/ModalShell';

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
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = reason.trim();
        if (!trimmed) {
            setError('Please describe why the work needs revision.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmit(trimmed);
            setReason('');
            onClose();
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
            onClose={onClose}
            isBusy={isSubmitting}
            panelClassName="w-full max-w-lg rounded-popup bg-surface-white p-6 shadow-xl border border-line"
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <h3 className="type-lg !font-[700] text-danger">
                        Reject Work
                    </h3>
                    <p className="type-xs text-ink-soft mt-1">
                        Please provide a clear reason so the provider knows what
                        needs to be fixed.
                    </p>
                </div>

                {error && (
                    <div className="rounded-input bg-danger/10 p-3 type-sm text-danger border border-danger/20">
                        {error}
                    </div>
                )}

                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="reject-reason"
                        className="type-xs font-semibold text-ink"
                    >
                        Reason for Revision
                    </label>
                    <textarea
                        id="reject-reason"
                        rows={5}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Describe the issues or missing items that need adjustment..."
                        className="w-full rounded-input border border-line bg-surface-white p-3 type-sm text-ink placeholder:text-ink-placeholder focus:border-danger focus:outline-none focus:ring-1 focus:ring-danger"
                        maxLength={10000}
                        required
                    />
                    <div className="text-right type-xs text-ink-soft">
                        {reason.length} / 10000
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-line">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-button border border-line px-4 py-2 type-sm font-semibold text-ink hover:bg-fill-subtle transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !reason.trim()}
                        className="rounded-button bg-danger px-5 py-2 type-sm font-semibold text-surface-white hover:bg-danger-hover transition-colors disabled:opacity-50 shadow-xs"
                    >
                        {isSubmitting ? 'Rejecting...' : 'Reject Work'}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
