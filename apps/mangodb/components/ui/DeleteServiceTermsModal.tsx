'use client';

import { useEffect, useId, useRef } from 'react';

type DeleteServiceTermsModalProps = {
    isOpen: boolean;
    isDeleting?: boolean;
    onClose: () => void;
    onConfirm: () => void;
};

export default function DeleteServiceTermsModal({
    isOpen,
    isDeleting = false,
    onClose,
    onConfirm,
}: DeleteServiceTermsModalProps) {
    const titleId = useId();
    const descriptionId = useId();
    const dialogRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialogRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-[2.6vh]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                ref={dialogRef}
                role="alertdialog"
                tabIndex={-1}
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className="rounded-[20px] max-h-[92vh] w-full max-w-[24vw] min-w-[280px] overflow-y-auto bg-[#FFFDF9] text-[#171717] px-[1.8vw] py-[2.6vh] shadow-xl focus:outline-none max-md:max-w-[75vw] max-sm:max-w-[90vw] max-md:px-[4vw]"
            >
                <div className="flex items-center gap-[1.1vw] max-sm:gap-3">
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

                    <div>
                        <h2
                            id={titleId}
                            className="text-md text-[#171717] !font-[600]"
                        >
                            Delete Service Terms
                        </h2>
                        <p
                            id={descriptionId}
                            className="mt-[1.2vh] text-xs text-[#171717] !font-[400]"
                        >
                            This action cannot be undone.
                        </p>
                    </div>
                </div>

                <hr className="my-[2.6vh] border-[#3F6B80]/20" />

                <div className="flex justify-end gap-[0.7vw] max-sm:flex-col-reverse max-sm:gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="rounded-[14px] h-[3.8vh] min-h-[34px] w-[6.8vw] min-w-[105px] px-3 bg-[#D9D9D9] text-xs text-[#756D6D] !font-[600] transition-colors hover:bg-[#CBCBCB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3F6B80] disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full"
                    >
                        Go Back
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="rounded-[14px] h-[3.8vh] min-h-[34px] w-[6.8vw] min-w-[105px] px-3 bg-[#C5483E] text-xs text-[#FFFDF9] !font-[600] transition-colors hover:bg-[#B93D35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5483E] disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full"
                    >
                        {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                </div>
            </section>
        </div>
    );
}
