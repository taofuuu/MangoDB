'use client';

import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';
import { describeError } from '@/lib/api';
import { closeJobPosting } from '@/lib/jobPostings';

interface CloseJobConfirmModalProps {
    jobPostingId: number;
    isOpen: boolean;
    onClose: () => void;
    // Called after the job is closed, so the caller can reload or update it.
    onClosed?: (() => void) | undefined;
}

// US2-14. The one Close confirmation, shared by the My Jobs card menu and the
// job detail modal.
export default function CloseJobConfirmModal({
    jobPostingId,
    isOpen,
    onClose,
    onClosed,
}: CloseJobConfirmModalProps) {
    // A thrown error becomes the modal's message.
    const confirmClose = async () => {
        try {
            await closeJobPosting(jobPostingId);
        } catch (err) {
            throw new Error(
                describeError(err, {
                    409: 'This job posting is already closed.',
                }),
            );
        }
        onClosed?.();
    };

    return (
        <DeleteConfirmationModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={confirmClose}
            title="Close Job Posting"
            description="It stops receiving proposals, and its pending proposals are rejected. A closed job posting cannot be reopened."
            confirmLabel="Yes, Close"
            pendingLabel="Closing..."
        />
    );
}
