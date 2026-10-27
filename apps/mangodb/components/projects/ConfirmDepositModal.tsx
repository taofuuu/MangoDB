'use client';

import { useId, useState } from 'react';
import { CircleAlert, X } from 'lucide-react';
import ConfirmModal, {
    type ConfirmModalBaseProps,
} from '@/components/ui/ConfirmModal';
import ModalShell from '@/components/ui/ModalShell';

type ConfirmDepositModalProps = ConfirmModalBaseProps;

// The Provider's two pop-ups for confirming the deposit (US4-7): first
// "Deposit Payment Confirmation", which says the Receiver reported paying,
// then "Are you sure?". Confirming in the second one calls onConfirm.
export default function ConfirmDepositModal({
    isOpen,
    ...props
}: ConfirmDepositModalProps) {
    // Unmounting on close sends a reopened flow back to the first pop-up.
    return isOpen ? <ConfirmDepositFlow {...props} /> : null;
}

function ConfirmDepositFlow({
    onClose,
    onConfirm,
}: Omit<ConfirmDepositModalProps, 'isOpen'>) {
    const [step, setStep] = useState<'notice' | 'confirm'>('notice');

    return (
        <>
            <DepositNoticeDialog
                isOpen={step === 'notice'}
                onClose={onClose}
                onContinue={() => setStep('confirm')}
            />
            <ConfirmModal
                isOpen={step === 'confirm'}
                onClose={onClose}
                onConfirm={onConfirm}
                title="Confirm Deposit Receipt"
                description={
                    <>
                        Are you sure you have received the deposit payment?
                        <br />
                        This action will update the project&apos;s payment
                        status.
                    </>
                }
                icon={null}
                confirmLabel="Confirm"
                confirmVariant="primary"
                pendingLabel="Confirming..."
                cancelLabel="Cancel"
            />
        </>
    );
}

type DepositNoticeDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onContinue: () => void;
};

// Not a ConfirmModal: it has a close X in place of a cancel button, and a
// warning line under the description. Sized and typeset to match it, since
// the two open one after the other.
function DepositNoticeDialog({
    isOpen,
    onClose,
    onContinue,
}: DepositNoticeDialogProps) {
    const titleId = useId();
    const descriptionId = useId();

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            labelledBy={titleId}
            describedBy={descriptionId}
            panelClassName="rounded-[20px] max-h-[92vh] w-full max-w-[30vw] min-w-[280px] overflow-y-auto bg-surface text-ink px-[1.8vw] py-[2.6vh] shadow-xl max-md:max-w-[75vw] max-sm:max-w-[90vw] max-md:px-[4vw]"
        >
            <div className="flex items-center justify-between gap-3">
                <h2 id={titleId} className="type-md text-ink !font-[600]">
                    Deposit Payment Confirmation
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="shrink-0 rounded text-ink-placeholder transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
                >
                    <X aria-hidden="true" className="size-5" />
                </button>
            </div>
            <hr className="mt-[1.2vh] border-line" />

            <p id={descriptionId} className="mt-[2.2vh] type-xs text-ink">
                The receiver has reported that the deposit has been paid. Please
                confirm whether you have received the deposit.
            </p>
            <p className="mt-[1.8vh] flex items-center gap-2 type-xs text-danger">
                <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
                Please confirm only if you have received the deposit payment.
            </p>

            <hr className="my-[2.2vh] border-line" />
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={onContinue}
                    className="rounded-[14px] h-[3.8vh] min-h-[34px] min-w-[105px] px-4 bg-brand type-xs text-surface !font-[600] transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand max-sm:w-full"
                >
                    Yes, I&apos;ve Received it
                </button>
            </div>
        </ModalShell>
    );
}
