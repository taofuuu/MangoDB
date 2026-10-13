'use client';

import { useId } from 'react';
import Button from '@/components/ui/Button';
import ModalShell from '@/components/ui/ModalShell';

type UnsavedChangesModalProps = {
    isOpen: boolean;
    onKeepEditing: () => void;
    onDiscard: () => void;
};

export default function UnsavedChangesModal({
    isOpen,
    onKeepEditing,
    onDiscard,
}: UnsavedChangesModalProps) {
    const titleId = useId();
    const descriptionId = useId();

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onKeepEditing}
            role="alertdialog"
            labelledBy={titleId}
            describedBy={descriptionId}
            panelClassName="w-full max-w-[460px] rounded-popup border border-line bg-surface p-7 shadow-xl"
        >
            <div className="flex items-start gap-4">
                <div
                    className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-danger-wash text-danger"
                    aria-hidden="true"
                >
                    <svg
                        className="h-6 w-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v4m0 4h.01M10.3 3.7 2.6 17a2 2 0 0 0 1.73 3h15.34a2 2 0 0 0 1.73-3L13.7 3.7a2 2 0 0 0-3.4 0Z"
                        />
                    </svg>
                </div>
                <div>
                    <h2 id={titleId} className="type-md font-semibold text-ink">
                        Discard unsaved changes?
                    </h2>
                    <p
                        id={descriptionId}
                        className="mt-2 type-sm leading-6 text-ink-soft"
                    >
                        Your service changes haven&apos;t been saved. If you
                        leave now, they&apos;ll be lost.
                    </p>
                </div>
            </div>

            <div className="mt-7 flex justify-end gap-3">
                <Button
                    variant="outline"
                    onClick={onKeepEditing}
                    className="px-5 py-2 type-sm font-semibold"
                >
                    Keep editing
                </Button>
                <Button
                    variant="danger"
                    onClick={onDiscard}
                    className="px-5 py-2 type-sm font-semibold"
                >
                    Discard changes
                </Button>
            </div>
        </ModalShell>
    );
}
