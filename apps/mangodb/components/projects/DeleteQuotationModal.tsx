'use client';

import type { Quotation } from '@mangodb/shared';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { deleteQuotation } from '@/lib/projects';

type DeleteQuotationModalProps = {
    // The one to delete. Null keeps the dialog closed.
    quotation: Quotation | null;
    onClose: () => void;
    // Called after the API has deleted it, to drop it from the list.
    onDeleted: (quotationId: number) => void;
};

export default function DeleteQuotationModal({
    quotation,
    onClose,
    onDeleted,
}: DeleteQuotationModalProps) {
    const handleConfirm = async () => {
        if (!quotation) return;
        await deleteQuotation(quotation.quotationId, quotation.projectId);
        onDeleted(quotation.quotationId);
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
