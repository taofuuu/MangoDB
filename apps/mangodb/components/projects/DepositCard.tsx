'use client';

import type { ReactNode } from 'react';
import { ReceiptText } from 'lucide-react';

// Colours for each state: blue once confirmed, yellow while waiting on the
// Provider, and grey before that. "neutral" is grey with a dark title, for
// the one grey state that asks the Receiver to act.
const TONES = {
    brand: {
        border: 'border-brand',
        icon: 'text-brand',
        title: 'text-ink',
        divider: 'border-brand-light/40',
    },
    accent: {
        border: 'border-accent',
        icon: 'text-accent',
        title: 'text-ink',
        divider: 'border-accent/40',
    },
    neutral: {
        border: 'border-line',
        icon: 'text-ink-soft',
        title: 'text-ink',
        divider: 'border-line',
    },
    muted: {
        border: 'border-line',
        icon: 'text-ink-soft',
        title: 'text-ink-soft',
        divider: 'border-line',
    },
} as const;

type DepositCardProps = {
    tone: keyof typeof TONES;
    // The icon at the right of the header, if the state has one.
    status?: ReactNode;
    // A one-line card: the header only, with no divider or body.
    compact?: boolean;
    children?: ReactNode;
};

// The card outline, the "Deposit" header and the divider every state shares,
// so a change to them is one edit. Only DepositSection uses it.
export default function DepositCard({
    tone,
    status,
    compact = false,
    children,
}: DepositCardProps) {
    const colors = TONES[tone];

    const title = (
        <div className="flex items-center gap-3">
            <ReceiptText
                className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} shrink-0 stroke-[2.2] ${colors.icon}`}
            />
            <span className={`type-sm !font-[600] ${colors.title}`}>
                Deposit
            </span>
        </div>
    );

    if (compact) {
        return (
            <div
                className={`rounded-status border ${colors.border} bg-surface-white p-4 shadow-card flex items-center justify-between transition-colors`}
            >
                {title}
                {status}
            </div>
        );
    }

    return (
        <div
            className={`rounded-status border ${colors.border} bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors`}
        >
            {status ? (
                <div className="flex items-center justify-between">
                    {title}
                    {status}
                </div>
            ) : (
                title
            )}

            <div className={`border-b ${colors.divider} w-full`} />

            {children}
        </div>
    );
}
