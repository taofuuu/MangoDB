'use client';

import ConfirmModal, {
    type ConfirmModalBaseProps,
} from '@/components/ui/ConfirmModal';

// The Receiver's "Reject this quotation?" (US4-5), from the Figma frame
// "US4-5 Reject quotation: confirmation modal". The warning icon is
// ConfirmModal's default.
export default function RejectQuotationModal(props: ConfirmModalBaseProps) {
    return (
        <ConfirmModal
            {...props}
            title="Reject this quotation?"
            description="Are you sure you want to reject this quotation? The provider can revise and resubmit it."
            confirmLabel="Reject Quotation"
            pendingLabel="Rejecting..."
            cancelLabel="Cancel"
        />
    );
}
