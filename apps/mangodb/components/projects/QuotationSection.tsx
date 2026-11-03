'use client';

import { useState } from 'react';
import type { ProjectDetail, Quotation } from '@mangodb/shared';
import {
    CheckCircle2,
    ClipboardClock,
    ClipboardList,
    ExternalLink,
    Plus,
} from 'lucide-react';
import DeleteQuotationModal from '@/components/projects/DeleteQuotationModal';

type QuotationSectionProps = {
    project: ProjectDetail;
    // Newest first, as GET /projects/:projectId/quotations returns them.
    quotations: Quotation[];
    onUploadQuotation?: (() => void) | undefined;
    onAcceptQuotation?: ((quotationId: number) => void) | undefined;
    onRejectQuotation?: ((quotationId: number) => void) | undefined;
    onDeleteQuotation?: ((quotationId: number) => void | Promise<void>) | undefined;
    isBusy?: boolean | undefined;
};

// The project page's Quotation card, in each state for the Provider and the
// Receiver: nothing sent yet, waiting on the Receiver, rejected, and
// accepted (or any status past Awaiting Quotation).
export default function QuotationSection({
    project,
    quotations,
    onUploadQuotation,
    onAcceptQuotation,
    onRejectQuotation,
    onDeleteQuotation,
    isBusy = false,
}: QuotationSectionProps) {
    const isProvider = project.myRole === 'provider';
    const isReceiver = project.myRole === 'receiver';
    const latestQuotation = quotations[0] ?? null;
    const qStatus = latestQuotation?.quotationStatus;
    const isPastQuotation = project.projectStatus !== 'AWAITING_QUOTATION';
    const isCancelled = project.projectStatus === 'CANCELLED';
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    if (isCancelled) {
        return (
            <div className="rounded-[20px] border border-line bg-surface-white p-5 shadow-card flex flex-col gap-3.5 transition-colors">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ClipboardList className="h-6 w-6 shrink-0 stroke-[2.2] text-ink-soft" />
                        <span className="type-sm !font-[600] text-ink-soft">
                            Quotation
                        </span>
                    </div>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fill-subtle text-ink-placeholder font-bold text-xs">
                        —
                    </span>
                </div>

                <div className="border-b border-line w-full" />

                <p className="type-sm text-ink-soft leading-relaxed">
                    {latestQuotation?.quotationStatus === 'ACCEPTED'
                        ? 'The quotation was accepted prior to project cancellation.'
                        : 'This project has been cancelled. Quotation submissions and reviews are closed.'}
                </p>

                {latestQuotation?.quotationFile && (
                    <a
                        href={latestQuotation.quotationFile}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-between gap-2 rounded-[12px] border border-line bg-fill-subtle/50 hover:bg-fill-subtle px-3 py-2 type-xs font-semibold text-ink-soft transition-colors shadow-2xs group"
                    >
                        <div className="flex items-center gap-2 truncate">
                            <span className="truncate">View Quotation</span>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-soft opacity-70 group-hover:opacity-100 transition-opacity" />
                    </a>
                )}
            </div>
        );
    }

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
                            <span className="truncate">View Quotation</span>
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
                    You&apos;ve accepted the quotation! You&apos;re all set to
                    move forward. Please pay the deposit and report the payment
                    once it&apos;s done.
                </p>

                {latestQuotation?.quotationFile && (
                    <a
                        href={latestQuotation.quotationFile}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-between gap-2 rounded-[12px] border border-brand/20 bg-brand-mist/50 hover:bg-brand-mist px-3 py-2 type-xs font-semibold text-brand transition-colors shadow-2xs group"
                    >
                        <div className="flex items-center gap-2 truncate">
                            <span className="truncate">View Quotation</span>
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
                        The receiver is reviewing your quotation. We’ll keep you
                        update.
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
                            <span className="truncate">View Quotation</span>
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
                            onClick={() => setIsDeleteOpen(true)}
                            disabled={isBusy}
                            className="flex-1 rounded-[14px] border border-danger text-danger bg-surface-white py-2 px-2 type-xs font-semibold hover:bg-danger/10 transition-colors disabled:opacity-50 shadow-xs text-center"
                        >
                            Remove Quotation
                        </button>
                    </div>

                    <DeleteQuotationModal
                        quotation={isDeleteOpen ? latestQuotation : null}
                        onClose={() => setIsDeleteOpen(false)}
                        onDeleted={(deletedId) => {
                            setIsDeleteOpen(false);
                            onDeleteQuotation?.(deletedId);
                        }}
                    />
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
                            <span className="truncate">View Quotation</span>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-soft opacity-70 group-hover:opacity-100 transition-opacity" />
                    </a>
                )}

                <p className="type-sm text-ink leading-relaxed">
                    Take your time to review the quotation. You can accept it or
                    reject it when you&apos;re ready.
                </p>

                {/* Receiver Accept / Reject buttons */}
                {isReceiver &&
                    project.projectStatus === 'AWAITING_QUOTATION' &&
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
                            <span className="truncate">View Quotation</span>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-danger opacity-70 group-hover:opacity-100 transition-opacity" />
                    </a>
                )}

                {isProvider &&
                    project.projectStatus === 'AWAITING_QUOTATION' &&
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
                    Upload your quotation for the receiver to review.
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
                We&apos;re waiting for the provider to submit a quotation. Once
                submitted, it will be available for your review.
            </p>
        </div>
    );
}
