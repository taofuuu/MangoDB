'use client';

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

    if (isDepositConfirmed) {
        if (isReceiver) {
            return (
                <div className="rounded-status border border-brand bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ReceiptText className="h-6 w-6 shrink-0 stroke-[2.2] text-brand" />
                            <span className="type-sm !font-[600] text-ink">
                                Deposit
                            </span>
                        </div>
                        <CheckCircle2 className="h-7 w-7 fill-brand text-surface-white shrink-0" />
                    </div>

                    <div className="border-b border-brand-light/40 w-full" />

                    <p className="type-sm text-ink leading-relaxed">
                        The provider has confirmed receipt of your deposit.
                        You&apos;re all set to move forward with the project!
                    </p>
                </div>
            );
        }

        // Confirmed by provider -> Blue (matches Frame in Figma)
        return (
            <div className="rounded-status border border-brand bg-surface-white p-4 shadow-card flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                    <ReceiptText className="h-5 w-5 shrink-0 stroke-[2.2] text-brand" />
                    <span className="type-sm !font-[600] text-ink">
                        Deposit
                    </span>
                </div>
                <CheckCircle2 className="h-7 w-7 fill-brand text-surface-white shrink-0" />
            </div>
        );
    }

    if (isDepositReported) {
        // Added by receiver, awaiting provider confirmation -> Yellow
        if (isProvider) {
            return (
                <div className="rounded-status border border-accent bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ReceiptText className="h-6 w-6 shrink-0 stroke-[2.2] text-accent" />
                            <span className="type-sm !font-[600] text-ink">
                                Deposit
                            </span>
                        </div>
                        <CircleCheck className="h-8 w-8 text-accent shrink-0 stroke-[2.2]" />
                    </div>

                    <div className="border-b border-accent/40 w-full" />

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
                </div>
            );
        }

        // Receiver view while awaiting provider confirmation
        return (
            <div className="rounded-status border border-accent bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ReceiptText className="h-6 w-6 shrink-0 stroke-[2.2] text-accent" />
                        <span className="type-sm !font-[600] text-ink">
                            Deposit
                        </span>
                    </div>
                    <CircleCheck className="h-7 w-7 text-accent shrink-0 stroke-[2.2]" />
                </div>

                <div className="border-b border-accent/40 w-full" />

                <p className="type-sm text-ink leading-relaxed">
                    Your deposit payment has been reported. We&apos;re waiting
                    for the provider to confirm receipt.
                </p>
            </div>
        );
    }

    // Receiver view when quotation is accepted but deposit is not reported yet
    if (isReceiver && isAwaitingDeposit) {
        return (
            <div className="rounded-status border border-line bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ReceiptText className="h-6 w-6 shrink-0 stroke-[2.2] text-ink-soft" />
                        <span className="type-sm !font-[600] text-ink">
                            Deposit
                        </span>
                    </div>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fill-subtle text-ink-placeholder type-xs !font-[700]">
                        —
                    </span>
                </div>

                <div className="border-b border-line w-full" />

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
            </div>
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
            <div className="rounded-status border border-line bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                <div className="flex items-center gap-3">
                    <ReceiptText className="h-6 w-6 shrink-0 stroke-[2.2] text-ink-soft" />
                    <span className="type-sm !font-[600] text-ink-soft">
                        Deposit
                    </span>
                </div>

                <div className="border-b border-line w-full" />

                <p className="type-sm text-ink-soft leading-relaxed">
                    {isAwaitingDeposit
                        ? 'The receiver can let you know once the deposit has been paid.'
                        : 'The receiver can report deposit payment after accepting the quotation.'}
                </p>
            </div>
        );
    }

    // Receiver before the quotation is accepted, or a project cancelled
    // before any report -> Grey
    return (
        <div className="rounded-status border border-line bg-surface-white p-4 shadow-card flex items-center justify-between transition-colors">
            <div className="flex items-center gap-3">
                <ReceiptText className="h-5 w-5 shrink-0 stroke-[2.2] text-ink-soft" />
                <span className="type-sm !font-[600] text-ink-soft">
                    Deposit
                </span>
            </div>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fill-subtle text-ink-placeholder type-xs !font-[700]">
                —
            </span>
        </div>
    );
}
