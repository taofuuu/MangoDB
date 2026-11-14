'use client';

import type { Quotation } from '@mangodb/shared';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { describeError } from '@/lib/api';

type DeleteQuotationModalProps = {
    // The one to delete. Null keeps the dialog closed.
    quotation: Quotation | null;
    onClose: () => void;
    // Deletes the quotation and updates the caller's state.
    onConfirm: (quotationId: number) => void | Promise<void>;
};

export default function DeleteQuotationModal({
    quotation,
    onClose,
    onConfirm,
}: DeleteQuotationModalProps) {
    const handleConfirm = async () => {
        if (!quotation) return;
        try {
            await onConfirm(quotation.quotationId);
        } catch (err: unknown) {
            throw new Error(
                describeError(err, {
                    offline: 'Failed to delete quotation.',
                }),
            );
        }
    };

    return (
        <ConfirmModal
            isOpen={quotation !== null}
            onClose={onClose}
            onConfirm={handleConfirm}
            title="Delete quotation"
            description={<span>This action cannot be undone.</span>}
            confirmLabel="Confirm"
            pendingLabel="Deleting..."
        />
    );
}
