'use client';

import {
    type MouseEvent,
    type ReactNode,
    useEffect,
    useId,
    useRef,
    useState,
} from 'react';

export type DeleteModalProps = {
    isOpen: boolean;
    isDeleting?: boolean;
    onClose: () => void;
    // Optional action. Without it, confirmation simply closes the popup.
    onConfirm?: () => void | Promise<void>;
};

type DeleteConfirmationModalProps = DeleteModalProps & {
    title: string;
    description?: ReactNode;
    icon?: ReactNode;
    layout?: 'inline' | 'stacked';
    confirmLabel?: string;
    confirmDisabled?: boolean;
    children?: ReactNode;
};

export default function DeleteConfirmationModal({
    isOpen,
    ...props
}: DeleteConfirmationModalProps) {
    // A fresh dialog starts with no pending action or error on every opening.
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
    confirmDisabled = false,
    children,
}: Omit<DeleteConfirmationModalProps, 'isOpen'>) {
    const titleId = useId();
    const descriptionId = useId();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const panelRef = useRef<HTMLFormElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const pendingRef = useRef(false);
    const mountedRef = useRef(false);
    const backdropPressRef = useRef(false);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isBusy = isDeleting || isPending;

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        mountedRef.current = true;
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;

        dialog.showModal();
        document.body.style.overflow = 'hidden';
        // Put initial focus on the least destructive action.
        if (cancelRef.current && !cancelRef.current.disabled) {
            cancelRef.current.focus();
        } else {
            titleRef.current?.focus();
        }

        return () => {
            mountedRef.current = false;
            dialog.close();
            document.body.style.overflow = previousOverflow;
            if (
                previousFocus instanceof HTMLElement &&
                previousFocus.isConnected
            ) {
                previousFocus.focus();
            }
        };
    }, []);

    const requestClose = () => {
        if (!pendingRef.current && !isDeleting) onClose();
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

    const isBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
        if (event.target !== event.currentTarget) return false;
        const bounds = panelRef.current?.getBoundingClientRect();
        if (!bounds) return false;
        return (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
        );
    };

    return (
        <dialog
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            aria-busy={isBusy}
            onCancel={(event) => {
                event.preventDefault();
                requestClose();
            }}
            onPointerDown={(event) => {
                backdropPressRef.current = isBackdrop(event);
            }}
            onClick={(event) => {
                if (backdropPressRef.current && isBackdrop(event))
                    requestClose();
                backdropPressRef.current = false;
            }}
            className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-[2.6vh] focus:outline-none open:flex backdrop:bg-black/40"
        >
            <form
                ref={panelRef}
                className="rounded-[20px] max-h-[92vh] w-full max-w-[24vw] min-w-[280px] overflow-y-auto bg-[#FFFDF9] text-[#171717] px-[1.8vw] py-[2.6vh] shadow-xl focus:outline-none max-md:max-w-[75vw] max-sm:max-w-[90vw] max-md:px-[4vw]"
                onSubmit={(event) => {
                    event.preventDefault();
                    void handleConfirm();
                }}
            >
                <div
                    className={
                        layout === 'stacked'
                            ? ''
                            : 'flex items-center gap-[1.1vw] max-sm:gap-3'
                    }
                >
                    <div
                        aria-hidden="true"
                        className={
                            layout === 'stacked'
                                ? 'flex justify-center'
                                : 'contents'
                        }
                    >
                        {icon}
                    </div>
                    <div>
                        <h2
                            ref={titleRef}
                            tabIndex={-1}
                            id={titleId}
                            className={
                                layout === 'stacked'
                                    ? 'text-md text-[#171717] !font-[600] text-center mt-[1.4vh] focus:outline-none'
                                    : 'text-md text-[#171717] !font-[600] focus:outline-none'
                            }
                        >
                            {title}
                        </h2>
                        <div
                            id={descriptionId}
                            className={
                                layout === 'stacked'
                                    ? 'contents'
                                    : 'mt-[1.2vh] text-xs text-[#171717] !font-[400]'
                            }
                        >
                            {description}
                        </div>
                    </div>
                </div>

                <fieldset disabled={isBusy} className="min-w-0 border-0 p-0">
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
                            ref={cancelRef}
                            type="button"
                            onClick={requestClose}
                            disabled={isBusy}
                            className={
                                layout === 'stacked'
                                    ? 'flex-1 rounded-[14px] h-[3.8vh] min-h-[34px] border-0 px-3 bg-[#D9D9D9] text-xs text-[#756D6D] !font-[600] outline-none transition-colors hover:bg-[#CBCBCB] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60'
                                    : 'rounded-[14px] h-[3.8vh] min-h-[34px] w-[6.8vw] min-w-[105px] border-0 px-3 bg-[#D9D9D9] text-xs text-[#756D6D] !font-[600] outline-none transition-colors hover:bg-[#CBCBCB] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full'
                            }
                        >
                            Go Back
                        </button>
                        <button
                            type="submit"
                            disabled={isBusy || confirmDisabled}
                            className={
                                layout === 'stacked'
                                    ? 'flex-1 rounded-[14px] h-[3.8vh] min-h-[34px] px-2 bg-[#C5483E] text-xs text-[#FFFDF9] !font-[600] transition-colors hover:bg-[#B93D35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5483E] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap'
                                    : 'rounded-[14px] h-[3.8vh] min-h-[34px] w-[6.8vw] min-w-[105px] px-3 bg-[#C5483E] text-xs text-[#FFFDF9] !font-[600] transition-colors hover:bg-[#B93D35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5483E] disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full'
                            }
                        >
                            {isBusy ? 'Deleting...' : confirmLabel}
                        </button>
                    </div>
                </fieldset>
            </form>
        </dialog>
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
