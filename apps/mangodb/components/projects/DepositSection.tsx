'use client';

import type { ProjectDetail, ProjectStatus } from '@mangodb/shared';
import { CheckCircle2, CircleCheck } from 'lucide-react';
import DepositCard from '@/components/projects/DepositCard';
import Button from '@/components/ui/Button';

type DepositSectionProps = {
    project: ProjectDetail;
    onReportDeposit?: (() => void) | undefined;
    onConfirmDeposit?: (() => void) | undefined;
    isBusy?: boolean | undefined;
};

// The icon a confirmed deposit shows at the right of its header.
const CONFIRMED_ICON = (
    <CheckCircle2 className="h-7 w-7 fill-brand text-surface-white shrink-0" />
);

// The grey dash where a state has nothing to show yet.
const DASH_BADGE = (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fill-subtle text-ink-placeholder type-xs !font-[700]">
        —
    </span>
);

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
            <DepositCard tone="muted" status={DASH_BADGE}>
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
                <DepositCard tone="brand" status={CONFIRMED_ICON}>
                    <p className="type-sm text-ink leading-relaxed">
                        The provider has confirmed receipt of your deposit.
                        You&apos;re all set to move forward with the project!
                    </p>
                </DepositCard>
            );
        }

        // Confirmed by provider -> Blue (matches Frame in Figma)
        return <DepositCard tone="brand" compact status={CONFIRMED_ICON} />;
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
                            <Button
                                variant="outline"
                                onClick={onConfirmDeposit}
                                disabled={isBusy}
                                className="w-full py-2 type-sm !font-[500] !text-brand shadow-xs"
                            >
                                Yes, I’ve Received it
                            </Button>
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
            <DepositCard tone="neutral" status={DASH_BADGE}>
                <p className="type-sm text-ink leading-relaxed">
                    Your quotation has been accepted! Please pay the deposit and
                    report the payment once it&apos;s done.
                </p>

                {onReportDeposit && (
                    <Button
                        variant="outline"
                        onClick={onReportDeposit}
                        disabled={isBusy}
                        className="w-full py-2 type-sm !text-brand shadow-xs"
                    >
                        Report Deposit Payment
                    </Button>
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
    return <DepositCard tone="muted" compact status={DASH_BADGE} />;
}
