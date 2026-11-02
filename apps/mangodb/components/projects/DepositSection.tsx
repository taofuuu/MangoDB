'use client';

import type { ReactNode } from 'react';
import type { ProjectDetail, ProjectStatus } from '@mangodb/shared';
import { CheckCircle2, CircleCheck, ReceiptText } from 'lucide-react';

type DepositSectionProps = {
    project: ProjectDetail;
    onReportDeposit?: (() => void) | undefined;
    onConfirmDeposit?: (() => void) | undefined;
    isBusy?: boolean | undefined;
};

// The project page's Deposit card, in each state for the Provider and the
// Receiver: before the deposit is due, waiting for the Receiver's report,
// waiting for the Provider to confirm, and confirmed.
export default function DepositSection({
    project,
    onReportDeposit,
    onConfirmDeposit,
    isBusy = false,
}: DepositSectionProps) {
    const isProvider = project.myRole === 'provider';
    const isReceiver = project.myRole === 'receiver';

    const isDepositConfirmed = !!project.depositConfirmedAt;
    const isDepositReported = !!project.depositReportedAt;
    // The API takes the report and the confirmation only while the project
    // is AWAITING_DEPOSIT (409 otherwise). A project cancelled in that state
    // keeps depositReportedAt, so the flag alone is not enough.
    const isAwaitingDeposit =
        project.projectStatus === ('AWAITING_DEPOSIT' satisfies ProjectStatus);
    const canConfirmDeposit = isDepositReported && isAwaitingDeposit;

    // A cancelled project, whatever was reported, for both roles (#239).
    if (project.projectStatus === ('CANCELLED' satisfies ProjectStatus)) {
        return (
            <DepositCard tone="muted" status={<DashBadge />}>
                <p className="type-sm text-ink-soft leading-relaxed">
                    {isDepositConfirmed
                        ? 'The deposit was confirmed prior to project cancellation.'
                        : 'This project has been cancelled. Deposit processing has ended.'}
                </p>
            </DepositCard>
        );
    }

    if (isDepositConfirmed) {
        if (isReceiver) {
            return (
                <DepositCard tone="brand" status={<ConfirmedIcon />}>
                    <p className="type-sm text-ink leading-relaxed">
                        The provider has confirmed receipt of your deposit.
                        You&apos;re all set to move forward with the project!
                    </p>
                </DepositCard>
            );
        }

        // Confirmed by provider -> Blue (matches Frame in Figma)
        return <DepositCard tone="brand" compact status={<ConfirmedIcon />} />;
    }

    if (isDepositReported) {
        // Added by receiver, awaiting provider confirmation -> Yellow
        if (isProvider) {
            return (
                <DepositCard
                    tone="accent"
                    status={
                        <CircleCheck className="h-8 w-8 text-accent shrink-0 stroke-[2.2]" />
                    }
                >
                    <p className="type-sm text-ink leading-relaxed">
                        The receiver has reported that the deposit has been
                        paid. Please confirm whether you have received the
                        deposit.
                    </p>

                    {onConfirmDeposit && canConfirmDeposit && (
                        <div className="w-full pt-1">
                            <button
                                type="button"
                                onClick={onConfirmDeposit}
                                disabled={isBusy}
                                className="w-full rounded-[14px] border border-brand bg-surface-white py-2 type-sm !font-[500] text-brand hover:bg-brand/10 transition-colors disabled:opacity-50 shadow-xs"
                            >
                                Yes, I’ve Received it
                            </button>
                        </div>
                    )}
                </DepositCard>
            );
        }

        // Receiver view while awaiting provider confirmation
        return (
            <DepositCard
                tone="accent"
                status={
                    <CircleCheck className="h-7 w-7 text-accent shrink-0 stroke-[2.2]" />
                }
            >
                <p className="type-sm text-ink leading-relaxed">
                    Your deposit payment has been reported. We&apos;re waiting
                    for the provider to confirm receipt.
                </p>
            </DepositCard>
        );
    }

    // Receiver view when quotation is accepted but deposit is not reported yet
    if (isReceiver && isAwaitingDeposit) {
        return (
            <DepositCard tone="neutral" status={<DashBadge />}>
                <p className="type-sm text-ink leading-relaxed">
                    Your quotation has been accepted! Please pay the deposit and
                    report the payment once it&apos;s done.
                </p>

                {onReportDeposit && (
                    <button
                        type="button"
                        onClick={onReportDeposit}
                        disabled={isBusy}
                        className="w-full rounded-[14px] border border-brand bg-surface-white py-2 type-sm text-brand hover:bg-brand/10 transition-colors disabled:opacity-50 shadow-xs"
                    >
                        Report Deposit Payment
                    </button>
                )}
            </DepositCard>
        );
    }

    // Provider view before the Receiver reports, from the Figma frames
    // "deposit section - awaiting quatation" and "- awaiting deposit".
    if (
        isProvider &&
        (isAwaitingDeposit ||
            project.projectStatus ===
                ('AWAITING_QUOTATION' satisfies ProjectStatus))
    ) {
        return (
            <DepositCard tone="muted">
                <p className="type-sm text-ink-soft leading-relaxed">
                    {isAwaitingDeposit
                        ? 'The receiver can let you know once the deposit has been paid.'
                        : 'The receiver can report deposit payment after accepting the quotation.'}
                </p>
            </DepositCard>
        );
    }

    // Receiver before the quotation is accepted -> Grey
    return <DepositCard tone="muted" compact status={<DashBadge />} />;
}

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
// so a change to them is one edit (review on #240).
function DepositCard({
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

function ConfirmedIcon() {
    return (
        <CheckCircle2 className="h-7 w-7 fill-brand text-surface-white shrink-0" />
    );
}

// The grey dash where a state has nothing to show yet.
function DashBadge() {
    return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fill-subtle text-ink-placeholder type-xs !font-[700]">
            —
        </span>
    );
}
