'use client';

import { useCallback, useId, useState } from 'react';
import { X } from 'lucide-react';
import type { Job, Proposal } from '@mangodb/shared';
import FieldError from '@/components/ui/FieldError';
import ModalShell from '@/components/ui/ModalShell';
import ProposalReceiptModal from './ProposalReceiptModal';
import { formatDateOnly } from '@/lib/dates';
import { formatBudgetRange } from '@/lib/money';
import { createProposal } from '@/lib/proposals';
import { toFormErrors } from '@/lib/validation/formErrors';
import {
    validateProposalForm,
    type ProposalErrors,
} from '@/lib/validation/proposal';

// The parts of a job the modal shows. company is the Receiver that posted it.
export type ProposalJob = Pick<
    Job,
    | 'jobId'
    | 'company'
    | 'listingTitle'
    | 'minBudget'
    | 'maxBudget'
    | 'deadline'
    | 'locationPref'
>;

type SubmitProposalModalProps = {
    isOpen: boolean;
    job: ProposalJob;
    onClose: () => void;
};

// Which visible input owns each validation detail returned by the API.
const PROPOSAL_FIELDS = {
    proposalTerms: 'proposalTerms',
    proposalBudget: 'proposalBudget',
    duration: 'estimatedDurationMonths',
} as const;

export default function SubmitProposalModal({
    isOpen,
    job,
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
    // way as the X button.
    const handleClose = useCallback(() => {
        resetForm();
        onClose();
        // resetForm only touches setters, which React keeps stable.
    }, [onClose]);

    if (!isOpen) {
        return null;
    }

    if (submittedProposal) {
        return (
            <ProposalReceiptModal
                isOpen
                job={job}
                proposal={submittedProposal}
                onClose={handleClose}
            />
        );
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
            const proposal = await createProposal(job.jobId, {
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
            backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            panelClassName="h-[72.2222vh] w-[calc(100vw-2rem)] sm:w-[44.5833vw] max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl bg-surface p-[1.5vw] text-ink shadow-xl"
        >
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
                    className="inline-flex size-11 items-center justify-center text-ink-placeholder hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <X className="size-5" aria-hidden="true" />
                </button>
            </div>

            <hr className="border-brand-dark/50" />

            <p className="my-2 type-sm">
                You are submitting a proposal to this job posting:
            </p>

            <section aria-label="Job posting summary">
                <h3 className="type-sm !font-[600]">{job.listingTitle}</h3>
                <p className="mt-1 type-sm">
                    Posted by {job.company.companyName}
                </p>

                <dl className="my-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div>
                        <dt className="type-xs text-ink-placeholder">Budget</dt>
                        <dd className="type-xs text-ink">
                            {formatBudgetRange(job.minBudget, job.maxBudget)}
                        </dd>
                    </div>
                    <div>
                        <dt className="type-xs text-ink-placeholder">
                            Deadline
                        </dt>
                        <dd className="type-xs text-ink">
                            {job.deadline
                                ? formatDateOnly(job.deadline)
                                : 'Not specified'}
                        </dd>
                    </div>
                    <div>
                        <dt className="type-xs text-ink-placeholder">
                            Location
                        </dt>
                        <dd className="type-xs text-ink">
                            {job.locationPref ?? 'Not specified'}
                        </dd>
                    </div>
                </dl>
            </section>

            <p className="my-2 type-xs">*Indicates required</p>

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
                            maxLength={10_000}
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
                                setEstimatedDurationMonths(event.target.value);
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
                        className="h-[4vh] min-w-[80px] rounded-status bg-brand-dark px-6 type-sm font-[500] text-surface transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? 'Submitting…' : 'Submit'}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
