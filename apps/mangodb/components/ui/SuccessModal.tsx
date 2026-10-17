'use client';

import { type ReactNode, useId } from 'react';
import Button from '@/components/ui/Button';
import ModalShell from '@/components/ui/ModalShell';

interface SuccessModalProps {
    isOpen: boolean;
    // Called by the button, Escape and the backdrop alike.
    onClose: () => void;
    title: string;
    message?: ReactNode;
    actionLabel?: string;
}

// "It worked", with one button. For a question, use ConfirmModal.
export default function SuccessModal({
    isOpen,
    onClose,
    title,
    message,
    actionLabel = 'Done',
}: SuccessModalProps) {
    const titleId = useId();
    const messageId = useId();

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            labelledBy={titleId}
            {...(message ? { describedBy: messageId } : {})}
            panelClassName="w-full max-w-[480px] rounded-popup border border-line bg-surface p-8 shadow-xl"
        >
            <div className="flex flex-col items-center">
                {/* Content Row: Checkmark Icon + Message */}
                <div className="flex items-center gap-4 w-full mb-6">
                    <div className="w-14 h-14 rounded-full border-[3px] border-brand flex items-center justify-center shrink-0">
                        <svg
                            className="w-7 h-7 text-brand"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                    <div>
                        <h3 id={titleId} className="type-md font-bold text-ink">
                            {title}
                        </h3>
                        {message && (
                            <p
                                id={messageId}
                                className="mt-2 type-xs text-ink-soft leading-relaxed"
                            >
                                {message}
                            </p>
                        )}
                    </div>
                </div>

                <hr className="w-full border-line mb-6" />

                {/* Footer Action Button */}
                <div className="w-full flex justify-end">
                    <Button
                        onClick={onClose}
                        className="px-8 py-2 type-sm font-semibold"
                    >
                        {actionLabel}
                    </Button>
                </div>
            </div>
        </ModalShell>
    );
}
