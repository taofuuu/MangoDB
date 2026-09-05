'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import binIcon from '@/assets/icons/bin.png';

type DeleteAccountModalProps = {
    isOpen: boolean;
    isDeleting?: boolean;
    expectedEmail?: string;
    onClose: () => void;
    onConfirm: (confirmedEmail: string) => void;
};

export default function DeleteAccountModal({
    isOpen,
    isDeleting = false,
    expectedEmail,
    onClose,
    onConfirm,
}: DeleteAccountModalProps) {
    const titleId = useId();
    const descriptionId = useId();
    const dialogRef = useRef<HTMLElement>(null);
    const [confirmEmail, setConfirmEmail] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setConfirmEmail('');
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

    const isMatch = expectedEmail
        ? confirmEmail.trim().toLowerCase() ===
          expectedEmail.trim().toLowerCase()
        : true;

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
                {/* Bin Icon in circle */}
                <div className="flex justify-center">
                    <div className="w-[4.8vw] h-[4.8vw] min-w-[56px] min-h-[56px] max-w-[72px] max-h-[72px] rounded-full bg-[#F0D1C9] flex items-center justify-center">
                        <Image
                            src={binIcon}
                            alt="Delete Account"
                            className="w-[2.4vw] h-[2.4vw] min-w-[28px] min-h-[28px] max-w-[36px] max-h-[36px] object-contain"
                        />
                    </div>
                </div>

                {/* Title */}
                <h2
                    id={titleId}
                    className="text-md text-[#171717] !font-[600] text-center mt-[1.4vh]"
                >
                    Delete Account
                </h2>

                {/* Warning message */}
                <p className="text-xs text-[#C6473A] text-center mt-[0.8vh] leading-snug">
                    <strong className="!font-[700]">WARNING</strong> this is
                    permanent and
                    <br />
                    cannot be undone!
                </p>

                {/* Explanation text */}
                <p
                    id={descriptionId}
                    className="text-xs text-[#171717] mt-[2.2vh] leading-relaxed"
                >
                    All of your personal data, preferences, and history will be
                    immediately and permanently deleted.
                </p>

                {/* Confirm email field */}
                <div className="mt-[2.2vh]">
                    <label
                        htmlFor="confirm-email-input"
                        className="block text-xs font-medium text-[#171717] mb-[0.8vh]"
                    >
                        Confirm mail
                    </label>
                    <input
                        id="confirm-email-input"
                        type="email"
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        placeholder={
                            expectedEmail
                                ? `Type "${expectedEmail}" to confirm`
                                : ''
                        }
                        className="w-full h-[3.8vh] min-h-[34px] px-3 rounded-[12px] border border-[#171717] bg-transparent text-xs text-[#171717] placeholder:text-[#999999] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                    />
                </div>

                {/* Divider line */}
                <hr className="my-[2.2vh] border-[#3F6B80]/20" />

                {/* Action buttons */}
                <div className="flex gap-[0.7vw] max-sm:flex-col-reverse max-sm:gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 rounded-[14px] h-[3.8vh] min-h-[34px] px-3 bg-[#D9D9D9] text-xs text-[#756D6D] !font-[600] transition-colors hover:bg-[#CBCBCB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3F6B80] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Go Back
                    </button>

                    <button
                        type="button"
                        onClick={() => onConfirm(confirmEmail)}
                        disabled={
                            isDeleting || (expectedEmail ? !isMatch : false)
                        }
                        className="flex-1 rounded-[14px] h-[3.8vh] min-h-[34px] px-2 bg-[#C5483E] text-xs text-[#FFFDF9] !font-[600] transition-colors hover:bg-[#B93D35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5483E] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete your account'}
                    </button>
                </div>
            </section>
        </div>
    );
}
