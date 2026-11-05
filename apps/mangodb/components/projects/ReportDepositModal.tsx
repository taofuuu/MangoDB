'use client';

import ConfirmModal, {
    type ConfirmModalBaseProps,
} from '@/components/ui/ConfirmModal';

// The Receiver's "Report Deposit Payment?" (US4-6), from the Figma frame
// "US4-6 report deposit payment: confermation modal". The frame has no
// icon, like the Provider's "Confirm Deposit Receipt" it leads to.
export default function ReportDepositModal(props: ConfirmModalBaseProps) {
    return (
        <ConfirmModal
            {...props}
            title="Report Deposit Payment?"
            description="Are you sure you want to report that you've paid the deposit? The provider will be asked to confirm once they've received the payment."
            icon={null}
            confirmLabel="Yes, Report Payment"
            confirmVariant="primary"
            pendingLabel="Reporting..."
            cancelLabel="Cancel"
        />
    );
}
