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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-[3.7vh]"
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
                className="rounded-popup max-h-[92vh] w-full max-w-[45vw] overflow-y-auto bg-[#FFFDF9] px-[2.6vw] py-[3.7vh] shadow-xl focus:outline-none max-md:max-w-[88vw] max-md:px-[6vw]"
            >
                <div className="flex items-start gap-[1.56vw] max-sm:gap-[4vw]">
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 80 74"
                        className="h-[6.48vh] min-h-[56px] w-[4.17vw] min-w-[64px] shrink-0"
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

                    <div className="pt-[0.46vh]">
                        <h2 id={titleId} className="text-lg !font-[600]">
                            Delete Service Terms?
                        </h2>
                        <p
                            id={descriptionId}
                            className="mt-[2.78vh] text-md !font-[400]"
                        >
                            This action cannot be undone.
                        </p>
                    </div>
                </div>

                <hr className="my-[3.7vh] border-[#3F6B80]/25" />

                <div className="flex justify-end gap-[1vw] max-sm:flex-col-reverse max-sm:gap-[1.5vh]">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="rounded-status h-[5.19vh] min-h-[48px] w-[9.38vw] min-w-[160px] bg-[#D9D9D9] text-md text-[#756D6D] !font-[600] transition-colors hover:bg-[#CBCBCB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3F6B80] disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full"
                    >
                        Go Back
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="rounded-status h-[5.19vh] min-h-[48px] w-[9.38vw] min-w-[160px] bg-[#CE473E] text-md text-[#FFFDF9] !font-[600] transition-colors hover:bg-[#B93D35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CE473E] disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full"
                    >
                        {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                </div>
            </section>
        </div>
    );
}
