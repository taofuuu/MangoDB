'use client';

import { useId } from 'react';
import Button from '@/components/ui/Button';
import ModalShell from '@/components/ui/ModalShell';
import WarningIcon from '@/components/ui/WarningIcon';

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
            panelClassName="flex h-[26.6667vh] min-h-[240px] w-[32.1354vw] min-w-[320px] flex-col rounded-popup border border-line bg-surface p-8 shadow-xl max-sm:h-auto max-sm:w-[90vw]"
        >
            <div className="flex min-h-0 w-full flex-[2] items-center gap-4 max-sm:pb-6">
                <WarningIcon />
                <div>
                    <h2 id={titleId} className="type-md font-bold text-ink">
                        You have unsaved changes.
                    </h2>
                    <p
                        id={descriptionId}
                        className="type-md font-bold text-ink"
                    >
                        Are you sure you want to leave?
                    </p>
                </div>
            </div>

            <hr className="w-full border-line" />

            <div className="flex min-h-0 w-full flex-1 items-center justify-end gap-3 max-sm:pt-6">
                <Button
                    variant="muted"
                    onClick={onKeepEditing}
                    className="px-5 py-2 type-sm font-bold disabled:opacity-60"
                >
                    Cancel
                </Button>
                <Button
                    variant="danger"
                    onClick={onDiscard}
                    className="px-5 py-2 type-sm font-bold"
                >
                    Leave
                </Button>
            </div>
        </ModalShell>
    );
}
