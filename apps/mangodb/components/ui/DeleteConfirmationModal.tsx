'use client';

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import ModalShell from './ModalShell';

export type DeleteModalProps = {
    isOpen: boolean;
    isDeleting?: boolean;
    onClose: () => void;
    // Optional action. Without it, confirmation simply closes the popup.
    onConfirm?: (() => void | Promise<void>) | undefined;
};

type DeleteConfirmationModalProps = DeleteModalProps & {
    title: string;
    description?: ReactNode;
    icon?: ReactNode;
    layout?: 'inline' | 'stacked';
    confirmLabel?: string;
    // 'danger' is every existing use of this modal — an irreversible delete.
    // 'primary' is for a confirmation that isn't destructive, like logout.
    confirmVariant?: 'danger' | 'primary';
    pendingLabel?: string;
    cancelLabel?: string;
    confirmDisabled?: boolean;
    children?: ReactNode;
};

const CONFIRM_VARIANTS: Record<'danger' | 'primary', string> = {
    danger: 'bg-[#C5483E] hover:bg-[#B93D35] focus-visible:outline-[#C5483E]',
    primary: 'bg-[#497B93] hover:bg-[#3F6B80] focus-visible:outline-[#497B93]',
};

export default function DeleteConfirmationModal({
    isOpen,
    ...props
}: DeleteConfirmationModalProps) {
    // ModalShell unmounts on close, so a fresh dialog starts with no pending
    // action and no error every time it opens.
    return isOpen ? <DeleteConfirmationDialog {...props} /> : null;
}

function DeleteConfirmationDialog({
    isDeleting = false,
    onClose,
    onConfirm,
    title,
    description = 'This action cannot be undone.',
    icon = <WarningIcon />,
    layout = 'inline',
    confirmLabel = 'Yes, Delete',
    confirmVariant = 'danger',
    pendingLabel = 'Deleting...',
    cancelLabel = 'Go Back',
    confirmDisabled = false,
    children,
}: Omit<DeleteConfirmationModalProps, 'isOpen'>) {
    const titleId = useId();
    const descriptionId = useId();
    const pendingRef = useRef(false);
    const mountedRef = useRef(false);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isBusy = isDeleting || isPending;

    // onConfirm can resolve after this dialog has gone — the caller usually
    // navigates away on success. Setting state then is a no-op React warns
    // about, so the handler below checks this first.
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const requestClose = () => {
        if (!isBusy) onClose();
    };

    const handleConfirm = async () => {
        // A ref also blocks two submissions before React updates the buttons.
        if (pendingRef.current || isDeleting || confirmDisabled) return;

        // Frontend-only popups need no action callback to confirm and close.
        if (!onConfirm) {
            onClose();
            return;
        }

        pendingRef.current = true;
        setIsPending(true);
        setError(null);

        try {
            await onConfirm();
            if (mountedRef.current) onClose();
        } catch (cause) {
            if (mountedRef.current) {
                setError(
                    cause instanceof Error && cause.message
                        ? cause.message
                        : 'Unable to delete. Please try again.',
                );
            }
        } finally {
            pendingRef.current = false;
            if (mountedRef.current) setIsPending(false);
        }
    };

    return (
        <ModalShell
            isOpen
            onClose={onClose}
            isBusy={isBusy}
            role="alertdialog"
            labelledBy={titleId}
            describedBy={descriptionId}
            panelClassName="rounded-[20px] max-h-[92vh] w-full max-w-[24vw] min-w-[280px] overflow-y-auto bg-[#FFFDF9] text-[#171717] px-[1.8vw] py-[2.6vh] shadow-xl max-md:max-w-[75vw] max-sm:max-w-[90vw] max-md:px-[4vw]"
        >
            <>
                {layout === 'stacked' ? (
                    <>
                        <div aria-hidden="true" className="flex justify-center">
                            {icon}
                        </div>
                        <h2
                            id={titleId}
                            className="text-md text-[#171717] !font-[600] text-center mt-[1.4vh]"
                        >
                            {title}
                        </h2>
                        <div id={descriptionId} className="contents">
                            {description}
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-[1.1vw] max-sm:gap-3">
                        {icon}
                        <div>
                            <h2
                                id={titleId}
                                className="text-md text-[#171717] !font-[600]"
                            >
                                {title}
                            </h2>
                            <p
                                id={descriptionId}
                                className="mt-[1.2vh] text-xs text-[#171717] !font-[400]"
                            >
                                {description}
                            </p>
                        </div>
                    </div>
                )}

                {children}
                {error && (
                    <p role="alert" className="mt-4 text-xs text-[#C5483E]">
                        {error}
                    </p>
                )}
                <hr
                    className={
                        layout === 'stacked'
                            ? 'my-[2.2vh] border-[#3F6B80]/20'
                            : 'my-[2.6vh] border-[#3F6B80]/20'
                    }
                />
                <div
                    className={
                        layout === 'stacked'
                            ? 'flex gap-[0.7vw] max-sm:flex-col-reverse max-sm:gap-2'
                            : 'flex justify-end gap-[0.7vw] max-sm:flex-col-reverse max-sm:gap-2'
                    }
                >
                    <button
                        type="button"
                        onClick={requestClose}
                        disabled={isBusy}
                        className={
                            layout === 'stacked'
                                ? 'flex-1 rounded-[14px] h-[3.8vh] min-h-[34px] border-0 px-3 bg-[#D9D9D9] text-xs text-[#756D6D] !font-[600] outline-none transition-colors hover:bg-[#CBCBCB] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60'
                                : 'rounded-[14px] h-[3.8vh] min-h-[34px] w-[6.8vw] min-w-[105px] border-0 px-3 bg-[#D9D9D9] text-xs text-[#756D6D] !font-[600] outline-none transition-colors hover:bg-[#CBCBCB] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full'
                        }
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleConfirm()}
                        disabled={isBusy || confirmDisabled}
                        className={
                            layout === 'stacked'
                                ? `flex-1 rounded-[14px] h-[3.8vh] min-h-[34px] px-2 text-xs text-[#FFFDF9] !font-[600] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap ${CONFIRM_VARIANTS[confirmVariant]}`
                                : `rounded-[14px] h-[3.8vh] min-h-[34px] w-[6.8vw] min-w-[105px] px-3 text-xs text-[#FFFDF9] !font-[600] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full ${CONFIRM_VARIANTS[confirmVariant]}`
                        }
                    >
                        {isBusy ? pendingLabel : confirmLabel}
                    </button>
                </div>
            </>
        </ModalShell>
    );
}

function WarningIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 80 74"
            className="h-[4.6vh] min-h-[38px] w-[3vw] min-w-[44px] shrink-0"
        >
            <path
                d="M35.3 6.1c2.1-3.6 7.3-3.6 9.4 0l34.1 58.2c2.1 3.6-.5 8.1-4.7 8.1H5.9c-4.2 0-6.8-4.5-4.7-8.1L35.3 6.1Z"
                fill="#C5483E"
            />
            <path
                d="M40 27v19"
                stroke="#FFFDF9"
                strokeWidth="5"
                strokeLinecap="round"
            />
            <circle cx="40" cy="56" r="2.8" fill="#FFFDF9" />
        </svg>
    );
}
