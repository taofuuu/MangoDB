'use client';

import { useEffect } from 'react';

export type StatusMessageData = {
    type: 'success' | 'error';
    message: string;
} | null;

type StatusMessageProps = {
    status?: StatusMessageData;
    onDismiss?: () => void;
    className?: string;
    autoDismissMs?: number;
};

// Global top-center popup for save success and error notifications.
export default function StatusMessage({
    status,
    onDismiss,
    className = '',
    autoDismissMs = 4000,
}: StatusMessageProps) {
    const isSuccess = status?.type === 'success';

    // Auto-dismiss success notification after delay if onDismiss is provided
    useEffect(() => {
        if (!status || !isSuccess || !onDismiss || autoDismissMs <= 0) {
            return;
        }

        const timer = setTimeout(() => {
            onDismiss();
        }, autoDismissMs);

        return () => clearTimeout(timer);
    }, [status, isSuccess, onDismiss, autoDismissMs]);

    if (!status) {
        return null;
    }

    return (
        <div
            role={isSuccess ? 'status' : 'alert'}
            aria-live={isSuccess ? 'polite' : 'assertive'}
            className={`fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center justify-between gap-4 rounded-xl px-5 py-3.5 shadow-md transition-all duration-300 min-w-[320px] max-w-[90vw] md:max-w-[520px] ${
                isSuccess
                    ? 'border border-[#497B93]/35 bg-[#EDF4F7] text-[#1E4353]'
                    : 'border border-[#C5483B]/35 bg-[#FDF0EE] text-[#8F271D]'
            } ${className}`}
        >
            <div className="flex items-center gap-3">
                {isSuccess ? (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#497B93] text-white">
                        <svg
                            className="size-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </span>
                ) : (
                    <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#C5483B] text-white font-bold text-sm font-sans"
                        aria-hidden="true"
                    >
                        !
                    </span>
                )}
                <span className="text-md font-medium">{status.message}</span>
            </div>

            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss notification"
                    className="ml-2 cursor-pointer p-1 text-sm font-semibold opacity-60 transition-opacity hover:opacity-100"
                >
                    ✕
                </button>
            )}
        </div>
    );
}
