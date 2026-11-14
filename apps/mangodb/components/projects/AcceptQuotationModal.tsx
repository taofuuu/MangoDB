'use client';

import { Check } from 'lucide-react';
import ConfirmModal, {
    type ConfirmModalBaseProps,
} from '@/components/ui/ConfirmModal';

type AcceptQuotationModalProps = ConfirmModalBaseProps & {
    // The Provider who sent the quotation.
    providerName: string;
};

// The Receiver's "Accept this quotation?" (US4-4), from the Figma frame
// "US4-4 Accept quotation: confirmation modal".
export default function AcceptQuotationModal({
    providerName,
    ...props
}: AcceptQuotationModalProps) {
    return (
        <ConfirmModal
            {...props}
            title="Accept this quotation?"
            description={
                <>
                    Please review the quotation details before accepting. Once
                    you accept, a project with <strong>{providerName}</strong>{' '}
                    will begin.
                </>
            }
            icon={
                <Check
                    aria-hidden="true"
                    strokeWidth={2.5}
                    className="h-[4.6vh] min-h-[38px] w-[3vw] min-w-[44px] shrink-0 text-brand"
                />
            }
            confirmLabel="Accept quotation"
            confirmVariant="primary"
            pendingLabel="Accepting..."
        />
    );
}
