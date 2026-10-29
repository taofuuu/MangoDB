'use client';

import Link from 'next/link';
import type {
    ProjectDetail,
    PublicCompanyProfile,
    Quotation,
    Review,
} from '@mangodb/shared';
import {
    Ban,
    CheckCircle2,
    CircleCheck,
    ClipboardClock,
    ClipboardList,
    ExternalLink,
    FileText,
    Globe,
    Mail,
    Phone,
    Plus,
    ReceiptText,
    Send,
    SquarePen,
    Star,
    X,
} from 'lucide-react';
import CompanyAvatar from '@/components/companies/CompanyAvatar';

type ProjectSidebarProps = {
    project: ProjectDetail;
    otherCompanyProfile: PublicCompanyProfile | null;
    quotations: Quotation[];
    review: Review | null;
    onUploadQuotation?: () => void;
    onAcceptQuotation?: (quotationId: number) => void;
    onRejectQuotation?: (quotationId: number) => void;
    onReportDeposit?: () => void;
    onConfirmDeposit?: () => void;
    onSubmitWork?: () => void;
    onAcceptWork?: () => void;
    onRejectWork?: () => void;
    onReviewProject?: () => void;
    onCancelProject?: () => void;
    isBusy?: boolean;
};

export default function ProjectSidebar({
    project,
    otherCompanyProfile,
    quotations,
    review,
    onUploadQuotation,
    onAcceptQuotation,
    onRejectQuotation,
    onReportDeposit,
    onConfirmDeposit,
    onSubmitWork,
    onAcceptWork,
    onRejectWork,
    onReviewProject,
    onCancelProject,
    isBusy = false,
}: ProjectSidebarProps) {
    const isProvider = project.myRole === 'provider';
    const isReceiver = project.myRole === 'receiver';
    const otherParty = isProvider ? project.receiver : project.provider;

    // Latest quotation (GET /projects/:id/quotations returns newest first)
    const latestQuotation = quotations[0] ?? null;
    const qStatus = latestQuotation?.quotationStatus;
    const isPastQuotation = project.projectStatus !== 'AWAITING_QUOTATION';
    const isQuotationAccepted = isPastQuotation || qStatus === 'ACCEPTED';

    // Deposit status
    const isDepositConfirmed = !!project.depositConfirmedAt;
    const isDepositReported = !!project.depositReportedAt;
    // A project cancelled after the Receiver's report keeps depositReportedAt,
    // but the API only confirms from AWAITING_DEPOSIT (409 otherwise).
    const canConfirmDeposit =
        isDepositReported && project.projectStatus === 'AWAITING_DEPOSIT';

    // Review average
    const reviewAverage = review
        ? (
              (review.workQualityScore +
                  review.serviceScore +
                  review.valueForMoneyScore +
                  review.deliveryTimeScore) /
              4
          ).toFixed(1)
        : null;

    return (
        <div className="flex w-full flex-col gap-4 sm:w-[320px] shrink-0">
            {/* 1. Other Party Profile Card */}
            <div className="rounded-[20px] border border-line bg-surface-white p-6 shadow-card flex flex-col items-center text-center">
                <div className="shrink-0 rounded-full p-0.5 ring-2 ring-brand mb-3">
                    <CompanyAvatar
                        name={otherParty.companyName}
                        photoUrl={otherParty.companyPhoto}
                        size={64}
                        className="!bg-brand-tint"
                    />
                </div>

                <Link
                    href={`/companies/${otherParty.companyId}`}
                    className="truncate type-md !font-[700] text-ink hover:underline max-w-full"
                >
                    {otherParty.companyName}
                </Link>

                <div className="mt-4 flex flex-col gap-2 w-full text-left type-xs text-ink-soft">
                    <div className="flex items-center gap-2 truncate">
                        <Globe className="h-3.5 w-3.5 shrink-0 text-brand" />
                        <span className="truncate">
                            {otherCompanyProfile?.website || '—'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-brand" />
                        <span className="truncate">
                            {otherCompanyProfile?.contactEmail || '—'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-brand" />
                        <span className="truncate">
                            {otherCompanyProfile?.phone || '—'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 2. Contract Section */}
            <div className="rounded-[20px] border border-line bg-surface-white px-5 py-4 shadow-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-brand shrink-0" />
                    <span className="type-sm !font-[600] text-ink">
                        Contract
                    </span>
                </div>
                <span className="type-xs text-ink-soft">Active</span>
            </div>

            {/* 3. Quotation Section */}
            {(() => {
                const qStatus = latestQuotation?.quotationStatus;
                const isPastQuotation =
                    project.projectStatus !== 'AWAITING_QUOTATION';

                if (isPastQuotation || qStatus === 'ACCEPTED') {
                    // Accepted -> Blue
                    if (isProvider) {
                        return (
                            <div className="rounded-[20px] border border-brand bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <ClipboardList className="h-6 w-6 shrink-0 stroke-[2.2] text-brand" />
                                        <span className="type-sm !font-[600] text-ink">
                                            Quotation
                                        </span>
                                    </div>
                                    <CheckCircle2 className="h-7 w-7 fill-brand text-surface-white shrink-0" />
                                </div>

                                <div className="border-b border-brand-light/40 w-full" />

                                <p className="type-sm text-ink leading-relaxed">
                                    The receiver has accepted your quotation.
                                </p>

                                <a
                                    href={latestQuotation?.quotationFile ?? '#'}
                                    target={
                                        latestQuotation?.quotationFile
                                            ? '_blank'
                                            : undefined
                                    }
                                    rel="noreferrer"
                                    onClick={(e) => {
                                        if (!latestQuotation?.quotationFile) {
                                            e.preventDefault();
                                        }
                                    }}
                                    className="w-full flex items-center justify-between gap-2 rounded-[12px] border border-brand/20 bg-brand-mist/50 hover:bg-brand-mist px-3 py-2 type-xs font-semibold text-brand transition-colors shadow-2xs group"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="truncate">
                                            View Quotation
                                        </span>
                                    </div>
                                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-brand opacity-70 group-hover:opacity-100 transition-opacity" />
                                </a>
                            </div>
                        );
                    }

                    // Receiver view when quotation is accepted
                    return (
                        <div className="rounded-[20px] border border-brand bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ClipboardList className="h-6 w-6 shrink-0 stroke-[2.2] text-brand" />
                                    <span className="type-sm !font-[600] text-ink">
                                        Quotation
                                    </span>
                                </div>
                                <CheckCircle2 className="h-7 w-7 fill-brand text-surface-white shrink-0" />
                            </div>

                            <div className="border-b border-brand-light/40 w-full" />

                            <p className="type-sm text-ink leading-relaxed">
                                You&apos;ve accepted the quotation! You&apos;re
                                all set to move forward. Please pay the deposit
                                and report the payment once it&apos;s done.
                            </p>

                            {latestQuotation?.quotationFile && (
                                <a
                                    href={latestQuotation.quotationFile}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full flex items-center justify-between gap-2 rounded-[12px] border border-brand/20 bg-brand-mist/50 hover:bg-brand-mist px-3 py-2 type-xs font-semibold text-brand transition-colors shadow-2xs group"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="truncate">
                                            View Quotation
                                        </span>
                                    </div>
                                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-brand opacity-70 group-hover:opacity-100 transition-opacity" />
                                </a>
                            )}
                        </div>
                    );
                }

                if (qStatus === 'PENDING') {
                    // Added, awaiting receiver acceptance -> Yellow
                    if (isProvider) {
                        return (
                            <div className="rounded-[20px] border border-accent bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <ClipboardList className="h-6 w-6 shrink-0 stroke-[2.2] text-accent" />
                                        <span className="type-sm !font-[600] text-ink">
                                            Quotation
                                        </span>
                                    </div>
                                    <ClipboardClock className="h-7 w-7 text-accent shrink-0 stroke-[2.2]" />
                                </div>

                                <div className="border-b border-accent/40 w-full" />

                                <p className="type-sm text-ink leading-relaxed">
                                    The receiver is reviewing your quotation.
                                    We’ll keep you update.
                                </p>

                                <a
                                    href={latestQuotation?.quotationFile ?? '#'}
                                    target={
                                        latestQuotation?.quotationFile
                                            ? '_blank'
                                            : undefined
                                    }
                                    rel="noreferrer"
                                    onClick={(e) => {
                                        if (!latestQuotation?.quotationFile) {
                                            e.preventDefault();
                                        }
                                    }}
                                    className="w-full flex items-center justify-between gap-2 rounded-[12px] border border-accent/30 bg-accent-tint/50 hover:bg-accent-tint px-3 py-2 type-xs font-semibold text-ink transition-colors shadow-2xs group"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="truncate">
                                            View Quotation
                                        </span>
                                    </div>
                                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-soft opacity-70 group-hover:opacity-100 transition-opacity" />
                                </a>

                                <div className="flex gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={onUploadQuotation}
                                        disabled={isBusy}
                                        className="flex-1 rounded-[14px] border border-brand bg-surface-white py-2 px-2 type-xs font-semibold text-brand hover:bg-brand/10 transition-colors disabled:opacity-50 shadow-xs text-center"
                                    >
                                        Replace File
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isBusy}
                                        className="flex-1 rounded-[14px] border border-danger text-danger bg-surface-white py-2 px-2 type-xs font-semibold hover:bg-danger/10 transition-colors disabled:opacity-50 shadow-xs text-center"
                                    >
                                        Remove Quotation
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    // Receiver view while awaiting receiver acceptance
                    return (
                        <div className="rounded-[20px] border border-accent bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ClipboardList className="h-6 w-6 shrink-0 stroke-[2.2] text-accent" />
                                    <span className="type-sm !font-[600] text-ink">
                                        Quotation
                                    </span>
                                </div>
                                <ClipboardClock className="h-7 w-7 text-accent shrink-0 stroke-[2.2]" />
                            </div>

                            <div className="border-b border-accent/40 w-full" />

                            {latestQuotation?.quotationFile && (
                                <a
                                    href={latestQuotation.quotationFile}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full flex items-center justify-between gap-2 rounded-[12px] border border-accent/30 bg-accent-tint/50 hover:bg-accent-tint px-3 py-2 type-xs font-semibold text-ink transition-colors shadow-2xs group"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="truncate">
                                            View Quotation
                                        </span>
                                    </div>
                                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-soft opacity-70 group-hover:opacity-100 transition-opacity" />
                                </a>
                            )}

                            <p className="type-sm text-ink leading-relaxed">
                                Take your time to review the quotation. You can
                                accept it or reject it when you&apos;re ready.
                            </p>

                            {/* Receiver Accept / Reject buttons */}
                            {isReceiver &&
                                project.projectStatus ===
                                    'AWAITING_QUOTATION' &&
                                onAcceptQuotation &&
                                onRejectQuotation &&
                                latestQuotation && (
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onAcceptQuotation(
                                                    latestQuotation.quotationId,
                                                )
                                            }
                                            disabled={isBusy}
                                            className="flex-1 rounded-[14px] border border-brand bg-surface-white text-brand py-2 px-2 type-xs font-semibold hover:bg-brand/10 transition-colors disabled:opacity-50 shadow-xs text-center"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onRejectQuotation(
                                                    latestQuotation.quotationId,
                                                )
                                            }
                                            disabled={isBusy}
                                            className="flex-1 rounded-[14px] border border-danger text-danger bg-surface-white py-2 px-2 type-xs font-semibold hover:bg-danger/10 transition-colors disabled:opacity-50 shadow-xs text-center"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                        </div>
                    );
                }

                if (qStatus === 'REJECTED') {
                    // Rejected -> Red
                    return (
                        <div className="rounded-[20px] border border-danger bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ClipboardList className="h-6 w-6 shrink-0 stroke-[2.2] text-danger" />
                                    <span className="type-sm !font-[600] text-danger">
                                        Quotation
                                    </span>
                                </div>
                                <svg
                                    width="16"
                                    height="20"
                                    viewBox="0 0 16 20"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-7 w-auto text-danger shrink-0"
                                >
                                    <path
                                        d="M15.41 5.41L10.58 0.58C10.21 0.21 9.7 0 9.17 0H2C0.9 0 0.0100002 0.9 0.0100002 2L0 18C0 19.1 0.89 20 1.99 20H14C15.1 20 16 19.1 16 18V6.83C16 6.3 15.79 5.79 15.41 5.41ZM8 16C6.35 16 4.81 15.19 3.88 13.83C3.65 13.49 3.73 13.02 4.07 12.79C4.41 12.55 4.88 12.64 5.11 12.98C5.76 13.93 6.84 14.5 7.99 14.5C9.92 14.5 11.49 12.93 11.49 11C11.49 9.07 9.93 7.5 8 7.5C6.67 7.5 5.48 8.24 4.89 9.39L6.5 11H3C2.72 11 2.5 10.78 2.5 10.5V7L3.8 8.3C4.71 6.89 6.26 6 8 6C10.76 6 13 8.24 13 11C13 13.76 10.76 16 8 16Z"
                                        fill="currentColor"
                                    />
                                </svg>
                            </div>

                            <div className="border-b border-danger/30 w-full" />

                            <p className="type-sm text-ink leading-relaxed">
                                {isReceiver
                                    ? "You've declined this quotation. The provider can revise it and submit an updated version for your review."
                                    : 'The receiver hasn’t accepted your quotation. Please review their feedback, make any necessary changes, and submit a revised quotation.'}
                            </p>

                            {latestQuotation?.quotationFile && (
                                <a
                                    href={latestQuotation.quotationFile}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full flex items-center justify-between gap-2 rounded-[12px] border border-danger/20 bg-danger-wash hover:bg-danger-tint/50 px-3 py-2 type-xs font-semibold text-danger transition-colors shadow-2xs group"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="truncate">
                                            View Quotation
                                        </span>
                                    </div>
                                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-danger opacity-70 group-hover:opacity-100 transition-opacity" />
                                </a>
                            )}

                            {isProvider &&
                                project.projectStatus ===
                                    'AWAITING_QUOTATION' &&
                                onUploadQuotation && (
                                    <button
                                        type="button"
                                        onClick={onUploadQuotation}
                                        disabled={isBusy}
                                        className="w-full rounded-[14px] border border-brand bg-surface-white py-2 type-sm font-semibold text-brand hover:bg-brand/10 transition-colors disabled:opacity-50 shadow-xs"
                                    >
                                        Revise & Resubmit Quotation
                                    </button>
                                )}
                        </div>
                    );
                }

                // Initial State (No quotation yet)
                // If Provider: Show upload quotation design (media_1793201491045_8a16055b.png)
                if (
                    isProvider &&
                    project.projectStatus === 'AWAITING_QUOTATION' &&
                    onUploadQuotation
                ) {
                    return (
                        <div className="rounded-[20px] border border-brand bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ClipboardList className="h-6 w-6 shrink-0 stroke-[2.2] text-brand" />
                                    <span className="type-sm !font-[600] text-ink">
                                        Quotation
                                    </span>
                                </div>
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-surface-white shadow-xs">
                                    <Plus className="h-5 w-5 stroke-[2.5]" />
                                </div>
                            </div>

                            <div className="border-b border-brand-light/50 w-full" />

                            <p className="type-sm text-ink leading-relaxed">
                                Upload your quotation for the receiver to
                                review.
                            </p>

                            <button
                                type="button"
                                onClick={onUploadQuotation}
                                disabled={isBusy}
                                className="w-full rounded-[14px] border border-brand bg-surface-white py-2 type-sm font-semibold text-brand hover:bg-brand/10 transition-colors disabled:opacity-50 shadow-xs"
                            >
                                Upload
                            </button>
                        </div>
                    );
                }

                // Receiver view before quotation is uploaded
                return (
                    <div className="rounded-[20px] border border-line bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ClipboardList className="h-6 w-6 shrink-0 stroke-[2.2] text-ink-soft" />
                                <span className="type-sm !font-[600] text-ink">
                                    Quotation
                                </span>
                            </div>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fill-subtle text-ink-placeholder font-bold text-xs">
                                —
                            </span>
                        </div>

                        <div className="border-b border-line w-full" />

                        <p className="type-sm text-ink leading-relaxed">
                            We&apos;re waiting for the provider to submit a
                            quotation. Once submitted, it will be available for
                            your review.
                        </p>
                    </div>
                );
            })()}

            {/* 4. Deposit Section */}
            {(() => {
                if (isDepositConfirmed) {
                    if (isReceiver) {
                        return (
                            <div className="rounded-[20px] border border-brand bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
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
                                    The provider has confirmed receipt of your
                                    deposit. You&apos;re all set to move forward
                                    with the project!
                                </p>
                            </div>
                        );
                    }

                    // Confirmed by provider -> Blue (matches Frame in Figma)
                    return (
                        <div className="rounded-[20px] border border-brand bg-surface-white p-4 shadow-card flex items-center justify-between transition-colors">
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
                            <div className="rounded-[20px] border border-accent bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
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
                                    The receiver has reported that the deposit
                                    has been paid. Please confirm whether you
                                    have received the deposit.
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
                        <div className="rounded-[20px] border border-accent bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
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
                                Your deposit payment has been reported.
                                We&apos;re waiting for the provider to confirm
                                receipt.
                            </p>
                        </div>
                    );
                }

                // Receiver view when quotation is accepted but deposit is not reported yet
                if (isReceiver && isQuotationAccepted) {
                    return (
                        <div className="rounded-[20px] border border-line bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ReceiptText className="h-6 w-6 shrink-0 stroke-[2.2] text-ink-soft" />
                                    <span className="type-sm !font-[600] text-ink">
                                        Deposit
                                    </span>
                                </div>
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fill-subtle text-ink-placeholder font-bold text-xs">
                                    —
                                </span>
                            </div>

                            <div className="border-b border-line w-full" />

                            <p className="type-sm text-ink leading-relaxed">
                                Your quotation has been accepted! Please pay the
                                deposit and report the payment once it&apos;s
                                done.
                            </p>

                            {onReportDeposit && (
                                <button
                                    type="button"
                                    onClick={onReportDeposit}
                                    disabled={isBusy}
                                    className="w-full rounded-[14px] border border-brand bg-surface-white py-2 type-sm font-semibold text-brand hover:bg-brand/10 transition-colors disabled:opacity-50 shadow-xs"
                                >
                                    Report Deposit Payment
                                </button>
                            )}
                        </div>
                    );
                }

                // Initial / Not reported yet (or before quotation is accepted) -> Grey
                return (
                    <div className="rounded-[20px] border border-line bg-surface-white p-4 shadow-card flex items-center justify-between transition-colors">
                        <div className="flex items-center gap-3">
                            <ReceiptText className="h-5 w-5 shrink-0 stroke-[2.2] text-ink-soft" />
                            <span className="type-sm !font-[600] text-ink-soft">
                                Deposit
                            </span>
                        </div>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fill-subtle text-ink-placeholder font-bold text-xs">
                            —
                        </span>
                    </div>
                );
            })()}

            {/* 5. Review Section */}
            {(() => {
                const isCompleted = project.projectStatus === 'COMPLETED';

                if (!isCompleted) {
                    // Initial State: Not completed -> Grey
                    return (
                        <div className="rounded-[20px] border border-line bg-surface-white p-4 shadow-card flex flex-col gap-3 transition-colors">
                            <div className="flex items-center gap-3">
                                <SquarePen className="h-5 w-5 text-ink-soft shrink-0 stroke-[2.2]" />
                                <span className="type-sm !font-[600] text-ink-soft">
                                    Review
                                </span>
                            </div>

                            <div className="border-b border-line w-full" />

                            <p className="type-xs text-ink-soft leading-relaxed">
                                The receiver can leave a review once the project
                                is successfully completed.
                            </p>
                        </div>
                    );
                }

                if (!review) {
                    // In Completed status, waiting for review -> Yellow
                    return (
                        <div className="rounded-[20px] border border-accent bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                            <div className="flex items-center gap-3">
                                <SquarePen className="h-6 w-6 text-accent shrink-0 stroke-[2.2]" />
                                <span className="type-sm !font-[600] text-ink">
                                    Review
                                </span>
                            </div>

                            <div className="border-b border-accent/40 w-full" />

                            {isReceiver ? (
                                <>
                                    <p className="type-sm text-ink leading-relaxed">
                                        You accepted this project. How did it
                                        go?
                                        <br />
                                        Your review helps other companies choose
                                        a Provider.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={onReviewProject}
                                        disabled={isBusy}
                                        className="w-full rounded-[14px] border border-brand bg-surface-white py-2 type-sm font-semibold text-brand hover:bg-brand/10 transition-colors disabled:opacity-50 shadow-xs"
                                    >
                                        Review this project
                                    </button>
                                </>
                            ) : (
                                <p className="type-sm text-ink-soft leading-relaxed">
                                    Project completed successfully! Waiting for
                                    receiver&apos;s review.
                                </p>
                            )}
                        </div>
                    );
                }

                // Reviewed -> Blue (Frame 443)
                return (
                    <div className="rounded-[20px] border border-brand bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                        <div className="flex items-center gap-3">
                            <SquarePen className="h-6 w-6 text-brand shrink-0 stroke-[2.2]" />
                            <span className="type-sm !font-[600] text-ink">
                                Review
                            </span>
                        </div>

                        <div className="border-b border-brand-light/40 w-full" />

                        {/* Average Rating */}
                        <div className="flex items-center gap-2">
                            <span className="type-sm !font-[600] text-ink">
                                Average Rating {reviewAverage}
                                <span className="text-ink-soft font-normal text-xs ml-0.5">
                                    /5
                                </span>
                            </span>
                            <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                        key={s}
                                        className={`h-3.5 w-3.5 ${
                                            Number(reviewAverage) >= s
                                                ? 'fill-accent text-accent'
                                                : 'fill-line text-line'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Scores Breakdown */}
                        <div className="flex flex-col gap-1.5 pt-1">
                            {[
                                {
                                    label: 'Work Quality',
                                    score: review.workQualityScore,
                                },
                                {
                                    label: 'Value for Money',
                                    score: review.valueForMoneyScore,
                                },
                                {
                                    label: 'Service',
                                    score: review.serviceScore,
                                },
                                {
                                    label: 'Delivery Time',
                                    score: review.deliveryTimeScore,
                                },
                            ].map((cat) => (
                                <div
                                    key={cat.label}
                                    className="flex items-center justify-between type-xs text-ink-soft"
                                >
                                    <span>{cat.label}</span>
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                                key={s}
                                                className={`h-3 w-3 ${
                                                    cat.score >= s
                                                        ? 'fill-accent text-accent'
                                                        : 'fill-line text-line'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Review Comment */}
                        {review.comment && (
                            <p className="type-xs text-ink leading-relaxed pt-2 border-t border-brand-light/40">
                                {review.comment}
                            </p>
                        )}
                    </div>
                );
            })()}

            {/* 6. Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-2">
                {/* Provider Actions: Submit Project right above Cancel Project */}
                {isProvider &&
                    project.projectStatus !== 'COMPLETED' &&
                    project.projectStatus !== 'CANCELLED' && (
                        <div className="rounded-[20px] border border-line bg-surface-white p-3.5 shadow-card flex flex-col gap-2.5">
                            {onSubmitWork && (
                                <button
                                    type="button"
                                    onClick={onSubmitWork}
                                    disabled={
                                        isBusy ||
                                        project.projectStatus !== 'IN_PROGRESS'
                                    }
                                    className="flex items-center justify-center gap-2 rounded-button bg-brand py-2.5 type-sm font-semibold text-surface-white hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                                >
                                    <Send className="h-4 w-4" />
                                    Submit Project
                                </button>
                            )}

                            {onCancelProject && (
                                <button
                                    type="button"
                                    onClick={onCancelProject}
                                    disabled={
                                        isBusy ||
                                        (project.projectStatus !==
                                            'AWAITING_QUOTATION' &&
                                            project.projectStatus !==
                                                'AWAITING_DEPOSIT')
                                    }
                                    className="flex items-center justify-center gap-2 rounded-button border border-danger text-danger bg-surface-white py-2.5 type-sm font-semibold hover:bg-danger/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Ban className="h-4 w-4" />
                                    Cancel Project
                                </button>
                            )}
                        </div>
                    )}

                {/* Receiver Actions */}
                {isReceiver && (
                    <>
                        {project.projectStatus === 'AWAITING_ACCEPTANCE' && (
                            <div className="rounded-[20px] border border-line bg-surface-white p-3.5 shadow-card flex flex-col gap-2.5">
                                {onAcceptWork && (
                                    <button
                                        type="button"
                                        onClick={onAcceptWork}
                                        disabled={isBusy}
                                        className="flex items-center justify-center gap-2 rounded-button bg-brand py-2.5 type-sm font-semibold text-surface-white hover:bg-brand-dark transition-colors disabled:opacity-50 shadow-xs"
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        Accept Work
                                    </button>
                                )}
                                {onRejectWork && (
                                    <button
                                        type="button"
                                        onClick={onRejectWork}
                                        disabled={isBusy}
                                        className="flex items-center justify-center gap-2 rounded-button border border-danger text-danger bg-surface-white py-2.5 type-sm font-semibold hover:bg-danger/10 transition-colors disabled:opacity-50"
                                    >
                                        <X className="h-4 w-4" />
                                        Reject Work
                                    </button>
                                )}
                            </div>
                        )}

                        {(project.projectStatus === 'AWAITING_QUOTATION' ||
                            project.projectStatus === 'AWAITING_DEPOSIT') &&
                            onCancelProject && (
                                <button
                                    type="button"
                                    onClick={onCancelProject}
                                    disabled={isBusy}
                                    className="flex items-center justify-center gap-2 rounded-button border border-danger text-danger bg-surface-white py-2.5 type-sm font-semibold hover:bg-danger/10 transition-colors disabled:opacity-50"
                                >
                                    <Ban className="h-4 w-4" />
                                    Cancel Project
                                </button>
                            )}
                    </>
                )}
            </div>
        </div>
    );
}
