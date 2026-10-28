'use client';

import { useState } from 'react';
import ModalShell from '@/components/ui/ModalShell';

type AddUpdateModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (updateText: string) => Promise<void>;
};

export default function AddUpdateModal({
    isOpen,
    onClose,
    onSubmit,
}: AddUpdateModalProps) {
    const [updateText, setUpdateText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = updateText.trim();
        if (!trimmed) {
            setError('Please enter your progress update note.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmit(trimmed);
            setUpdateText('');
            onClose();
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
            onClose={onClose}
            isBusy={isSubmitting}
            panelClassName="w-full max-w-lg rounded-popup bg-surface-white p-6 shadow-xl border border-line"
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <h3 className="type-lg !font-[700] text-ink">
                        Add Progress Update
                    </h3>
                    <p className="type-xs text-ink-soft mt-1">
                        Share notes, milestones, or current progress with the
                        client.
                    </p>
                </div>

                {error && (
                    <div className="rounded-input bg-danger/10 p-3 type-sm text-danger border border-danger/20">
                        {error}
                    </div>
                )}

                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="update-text"
                        className="type-xs font-semibold text-ink"
                    >
                        Update Note
                    </label>
                    <textarea
                        id="update-text"
                        rows={5}
                        value={updateText}
                        onChange={(e) => setUpdateText(e.target.value)}
                        placeholder="e.g. Completed initial API endpoints and database schema..."
                        className="w-full rounded-input border border-line bg-surface-white p-3 type-sm text-ink placeholder:text-ink-placeholder focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                        maxLength={10000}
                        required
                    />
                    <div className="text-right type-xs text-ink-soft">
                        {updateText.length} / 10000
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
                        disabled={isSubmitting || !updateText.trim()}
                        className="rounded-button bg-brand px-5 py-2 type-sm font-semibold text-surface-white hover:bg-brand-dark transition-colors disabled:opacity-50 shadow-xs"
                    >
                        {isSubmitting ? 'Adding...' : 'Post Update'}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
