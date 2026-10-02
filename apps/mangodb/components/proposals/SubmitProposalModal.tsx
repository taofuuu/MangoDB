'use client';

import { useCallback, useId, useState } from 'react';
import { MailCheck } from 'lucide-react';
import type { JobPosting, Proposal } from '@mangodb/shared';
import FieldError from '@/components/ui/FieldError';
import ModalShell from '@/components/ui/ModalShell';
import { createProposal } from '@/lib/proposals';
import {
    toFormErrors,
    validateProposalForm,
    type ProposalErrors,
} from '@/lib/validation';

// JobPosting is the shared API shape. companyName is optional display-only
// information because the job-posting endpoint currently returns companyId,
// not the name. T2.7 may supply it when that view already has it.
export type ProposalJobPosting = Pick<
    JobPosting,
    | 'jobPostingId'
    | 'listingTitle'
    | 'minBudget'
    | 'maxBudget'
    | 'deadline'
    | 'locationPref'
> & {
    companyName?: string | undefined;
};

type SubmitProposalModalProps = {
    isOpen: boolean;
    jobPosting: ProposalJobPosting;
    onClose: () => void;
};

// Which visible input owns each validation detail returned by the API.
const PROPOSAL_FIELDS = {
    proposalTerms: 'proposalTerms',
    proposalBudget: 'proposalBudget',
    duration: 'estimatedDurationMonths',
} as const;

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
});

const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
] as const;

function formatBudget(
    minBudget: number | null,
    maxBudget: number | null,
): string {
    if (maxBudget === null) {
        return minBudget === null
            ? 'Not specified'
            : NUMBER_FORMATTER.format(minBudget);
    }

    if (minBudget !== null && minBudget !== maxBudget) {
        return `${NUMBER_FORMATTER.format(minBudget)} – ${NUMBER_FORMATTER.format(maxBudget)}`;
    }

    return NUMBER_FORMATTER.format(maxBudget);
}

// deadline is a date-only wire value. Splitting it avoids shifting the day in
// a UTC+7 browser, as required by docs/conventions.md section 10.
function formatDeadline(deadline: string | null): string {
    if (!deadline) return 'Not specified';

    const [year, month, day] = deadline.split('-').map(Number);
    if (!year || !month || !day || !MONTHS[month - 1]) return deadline;

    return `${day} ${MONTHS[month - 1]} ${year}`;
}

export default function SubmitProposalModal({
    isOpen,
    jobPosting,
    onClose,
}: SubmitProposalModalProps) {
    const [proposalTerms, setProposalTerms] = useState('');
    const [proposalBudget, setProposalBudget] = useState('');
    const [estimatedDurationMonths, setEstimatedDurationMonths] = useState('');
    const [errors, setErrors] = useState<ProposalErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedProposal, setSubmittedProposal] = useState<Proposal | null>(
        null,
    );
    const titleId = useId();

    // As in the certificate forms, editing a field clears its old error. The
    // next submit will validate the new value.
    const clearError = (field: keyof ProposalErrors) =>
        setErrors((previous) => ({ ...previous, [field]: undefined }));

    const resetForm = () => {
        setProposalTerms('');
        setProposalBudget('');
        setEstimatedDurationMonths('');
        setErrors({});
        setFormError(null);
        setIsSubmitting(false);
        setSubmittedProposal(null);
    };

    // One close path, so Escape and the backdrop clear the form in the same
    // way as the X button, matching AddCertificateForm.
    const handleClose = useCallback(() => {
        resetForm();
        onClose();
        // resetForm only touches setters, which React keeps stable.
    }, [onClose]);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        setErrors({});
        setFormError(null);

        const draft = {
            proposalTerms: proposalTerms.trim(),
            proposalBudget: proposalBudget.trim(),
            estimatedDurationMonths: estimatedDurationMonths.trim(),
        };
        const nextErrors = validateProposalForm(draft);

        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setIsSubmitting(true);
        try {
            const proposal = await createProposal(jobPosting.jobPostingId, {
                proposalTerms: draft.proposalTerms,
                proposalBudget: Number(draft.proposalBudget),
                duration: Number(draft.estimatedDurationMonths),
            });
            setSubmittedProposal(proposal);
        } catch (cause) {
            const { fields, message } = toFormErrors(cause, PROPOSAL_FIELDS);
            setErrors(fields);
            setFormError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ModalShell
            isOpen
            onClose={handleClose}
            isBusy={isSubmitting}
            labelledBy={titleId}
            backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            panelClassName={`modal-scrollbar w-[44.5833vw] max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl bg-surface p-[1.5vw] text-ink shadow-xl ${submittedProposal ? '' : 'h-[72.2222vh]'}`}
        >
            {submittedProposal ? (
                <>
                    <div className="flex items-center gap-2">
                        <MailCheck
                            className="size-5 text-ink"
                            aria-hidden="true"
                        />
                        <h2 id={titleId} className="type-sm !font-[600]">
                            Proposal submitted
                        </h2>
                    </div>

                    <p className="my-2 type-sm">
                        Your proposal for {jobPosting.listingTitle} has been
                        sent to {jobPosting.companyName ?? 'the company'}.
                    </p>

                    <div className="space-y-2">
                        <div>
                            <p className="type-xs text-ink-placeholder">
                                Proposal term
                            </p>
                            <p className="whitespace-pre-wrap type-xs text-ink">
                                {submittedProposal.proposalTerms}
                            </p>
                        </div>

                        <div>
                            <p className="type-xs text-ink-placeholder">
                                Your quoted price
                            </p>
                            <p className="type-xs text-ink">
                                {NUMBER_FORMATTER.format(
                                    submittedProposal.proposalBudget,
                                )}
                            </p>
                        </div>

                        <div>
                            <p className="type-xs text-ink-placeholder">
                                Estimated duration
                            </p>
                            <p className="type-xs text-ink">
                                {NUMBER_FORMATTER.format(
                                    submittedProposal.duration,
                                )}{' '}
                                months
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="h-[4vh] w-[7vw] rounded-status bg-fill-muted type-sm font-[500] text-ink transition-colors hover:bg-line"
                        >
                            Close
                        </button>
                    </div>
                </>
            ) : (
                <>
                    {/* -------------header----------------- */}
                    <div className="flex items-center justify-between">
                        <h2 id={titleId} className="type-lg">
                            Submit a proposal
                        </h2>

                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            aria-label="Close"
                            className="text-ink-placeholder hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            X
                        </button>
                    </div>

                    <hr className="border-brand-dark/50" />

                    <p className="my-2 type-sm">
                        You are submitting a proposal to this job posting:
                    </p>

                    <section aria-label="Job posting summary">
                        <h3 className="type-sm !font-[600]">
                            {jobPosting.listingTitle}
                        </h3>
                        {jobPosting.companyName && (
                            <p className="mt-1 type-sm">
                                Posted by {jobPosting.companyName}
                            </p>
                        )}

                        <dl className="my-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <div>
                                <dt className="type-xs text-ink-placeholder">
                                    Budget
                                </dt>
                                <dd className="type-xs text-ink">
                                    {formatBudget(
                                        jobPosting.minBudget,
                                        jobPosting.maxBudget,
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="type-xs text-ink-placeholder">
                                    Deadline
                                </dt>
                                <dd className="type-xs text-ink">
                                    {formatDeadline(jobPosting.deadline)}
                                </dd>
                            </div>
                            <div>
                                <dt className="type-xs text-ink-placeholder">
                                    Location
                                </dt>
                                <dd className="type-xs text-ink">
                                    {jobPosting.locationPref ?? 'Not specified'}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <div>
                        <label className="my-2 block type-sm !text-[12px]">
                            *Indicates required
                        </label>
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="space-y-2">
                            <div>
                                <label
                                    htmlFor="proposal-terms"
                                    className="block type-sm"
                                >
                                    Proposal terms*
                                </label>

                                <textarea
                                    id="proposal-terms"
                                    value={proposalTerms}
                                    onChange={(event) => {
                                        setProposalTerms(event.target.value);
                                        clearError('proposalTerms');
                                    }}
                                    required
                                    aria-invalid={
                                        errors.proposalTerms ? true : undefined
                                    }
                                    aria-describedby={
                                        errors.proposalTerms
                                            ? 'proposal-terms-error'
                                            : undefined
                                    }
                                    className="h-[13.36vh] px-1.5 py-1.5 w-full resize-none rounded-input border border-brand bg-surface-white/80 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                                />
                                <FieldError
                                    message={errors.proposalTerms}
                                    id="proposal-terms-error"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="proposal-budget"
                                    className="block type-sm"
                                >
                                    Your quoted price*
                                </label>

                                <input
                                    id="proposal-budget"
                                    type="text"
                                    inputMode="decimal"
                                    value={proposalBudget}
                                    onChange={(event) => {
                                        setProposalBudget(event.target.value);
                                        clearError('proposalBudget');
                                    }}
                                    required
                                    aria-invalid={
                                        errors.proposalBudget ? true : undefined
                                    }
                                    aria-describedby={
                                        errors.proposalBudget
                                            ? 'proposal-budget-error'
                                            : undefined
                                    }
                                    className="h-[4.07vh] px-1.5 w-full rounded-input border border-brand bg-surface-white/80 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                                />
                                <FieldError
                                    message={errors.proposalBudget}
                                    id="proposal-budget-error"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="proposal-estimated-duration-months"
                                    className="block type-sm font-normal"
                                >
                                    Estimated duration (months)*
                                </label>

                                <input
                                    id="proposal-estimated-duration-months"
                                    type="text"
                                    inputMode="decimal"
                                    value={estimatedDurationMonths}
                                    onChange={(event) => {
                                        setEstimatedDurationMonths(
                                            event.target.value,
                                        );
                                        clearError('estimatedDurationMonths');
                                    }}
                                    required
                                    aria-invalid={
                                        errors.estimatedDurationMonths
                                            ? true
                                            : undefined
                                    }
                                    aria-describedby={
                                        errors.estimatedDurationMonths
                                            ? 'proposal-estimated-duration-months-error'
                                            : undefined
                                    }
                                    className="h-[4.07vh] px-1.5 w-full rounded-input border border-brand bg-surface-white/80 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                                />
                                <FieldError
                                    message={errors.estimatedDurationMonths}
                                    id="proposal-estimated-duration-months-error"
                                />
                            </div>
                        </div>

                        <FieldError message={formError} />

                        <div className="flex items-center justify-end gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-[4vh] w-[7vw] rounded-status bg-brand-dark type-sm font-[500] text-surface transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting…' : 'Submit'}
                            </button>
                        </div>
                    </form>
                </>
            )}
        </ModalShell>
    );
}
