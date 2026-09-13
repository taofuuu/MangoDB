'use client';

import { useEffect } from 'react';

export type StatusMessageData = {
    type: 'success' | 'error';
    message: string;
} | null;

type StatusMessageProps = {
    status?: StatusMessageData | undefined;
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
                    ? 'border border-brand/35 bg-brand-tint text-brand-deep'
                    : 'border border-danger/35 bg-danger-wash text-danger-deep'
            } ${className}`}
        >
            <div className="flex items-center gap-3">
                {isSuccess ? (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-white">
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
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-danger text-white font-bold type-sm font-sans"
                        aria-hidden="true"
                    >
                        !
                    </span>
                )}
                <span className="type-md font-medium">{status.message}</span>
            </div>

            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss notification"
                    className="ml-2 cursor-pointer p-1 type-sm font-semibold opacity-60 transition-opacity hover:opacity-100"
                >
                    ✕
                </button>
            )}
        </div>
    );
}
