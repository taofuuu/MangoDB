'use client';

import { useCallback, useId, useState } from 'react';
import { X } from 'lucide-react';
import type { Proposal } from '@mangodb/shared';
import FieldError from '@/components/ui/FieldError';
import ModalShell from '@/components/ui/ModalShell';
import HireRequestReceiptModal from './HireRequestReceiptModal';
import { createHireRequest } from '@/lib/proposals';
import { toFormErrors } from '@/lib/validation/formErrors';
import {
    validateHireRequestForm,
    type HireRequestErrors,
} from '@/lib/validation/hireRequest';

type HireRequestModalProps = {
    isOpen: boolean;
    serviceId: number;
    serviceName: string;
    // The company that posted the service.
    companyName: string;
    onClose: () => void;
};

// Which visible input owns each validation detail returned by the API.
const HIRE_REQUEST_FIELDS = {
    proposalTerms: 'requestTerms',
    proposalBudget: 'budget',
    duration: 'durationMonths',
} as const;

const INPUT_CLASS =
    'h-[4.07vh] px-1.5 w-full rounded-input border border-brand bg-surface-white/80 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand';

// Same fields and layout as SubmitProposalModal, for a hire request on a
// service. The API saves it as a proposal on that service.
export default function HireRequestModal({
    isOpen,
    serviceId,
    serviceName,
    companyName,
    onClose,
}: HireRequestModalProps) {
    const [requestTerms, setRequestTerms] = useState('');
    const [budget, setBudget] = useState('');
    const [durationMonths, setDurationMonths] = useState('');
    const [errors, setErrors] = useState<HireRequestErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sent, setSent] = useState<Proposal | null>(null);
    const titleId = useId();

    const clearError = (field: keyof HireRequestErrors) =>
        setErrors((previous) => ({ ...previous, [field]: undefined }));

    // One close path, so Escape and the backdrop clear the form in the same
    // way as the X and Cancel buttons.
    const handleClose = useCallback(() => {
        setRequestTerms('');
        setBudget('');
        setDurationMonths('');
        setErrors({});
        setFormError(null);
        setIsSubmitting(false);
        setSent(null);
        onClose();
    }, [onClose]);

    if (!isOpen) {
        return null;
    }

    if (sent) {
        return (
            <HireRequestReceiptModal
                isOpen
                serviceName={serviceName}
                companyName={companyName}
                request={sent}
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
            requestTerms: requestTerms.trim(),
            budget: budget.trim(),
            durationMonths: durationMonths.trim(),
        };
        const nextErrors = validateHireRequestForm(draft);

        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setIsSubmitting(true);
        try {
            const proposal = await createHireRequest(serviceId, {
                proposalTerms: draft.requestTerms,
                proposalBudget: Number(draft.budget),
                duration: Number(draft.durationMonths),
            });
            setSent(proposal);
        } catch (cause) {
            const { fields, message } = toFormErrors(
                cause,
                HIRE_REQUEST_FIELDS,
            );
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
            panelClassName="w-[calc(100vw-2rem)] sm:w-[44.5833vw] max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl bg-surface p-[1.5vw] text-ink shadow-xl"
        >
            <div className="flex items-center justify-between">
                <h2 id={titleId} className="type-lg">
                    Send a hire request
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
                You are sending a hire request to this service:
            </p>

            <section aria-label="Service summary">
                <h3 className="type-sm !font-[600]">{serviceName}</h3>
                <p className="mt-1 type-sm">Posted by {companyName}</p>
            </section>

            <p className="my-2 type-xs">*Indicates required</p>

            <form onSubmit={handleSubmit} noValidate>
                <div className="space-y-2">
                    <div>
                        <label
                            htmlFor="hire-request-terms"
                            className="block type-sm"
                        >
                            Request terms*
                        </label>
                        <textarea
                            id="hire-request-terms"
                            value={requestTerms}
                            onChange={(event) => {
                                setRequestTerms(event.target.value);
                                clearError('requestTerms');
                            }}
                            required
                            maxLength={10_000}
                            aria-invalid={
                                errors.requestTerms ? true : undefined
                            }
                            aria-describedby={
                                errors.requestTerms
                                    ? 'hire-request-terms-error'
                                    : undefined
                            }
                            className="h-[13.36vh] px-1.5 py-1.5 w-full resize-none rounded-input border border-brand bg-surface-white/80 type-sm text-ink placeholder:text-line focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                        <FieldError
                            message={errors.requestTerms}
                            id="hire-request-terms-error"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="hire-request-budget"
                            className="block type-sm"
                        >
                            Budget*
                        </label>
                        <input
                            id="hire-request-budget"
                            type="text"
                            inputMode="decimal"
                            value={budget}
                            onChange={(event) => {
                                setBudget(event.target.value);
                                clearError('budget');
                            }}
                            required
                            aria-invalid={errors.budget ? true : undefined}
                            aria-describedby={
                                errors.budget
                                    ? 'hire-request-budget-error'
                                    : undefined
                            }
                            className={INPUT_CLASS}
                        />
                        <FieldError
                            message={errors.budget}
                            id="hire-request-budget-error"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="hire-request-duration"
                            className="block type-sm font-normal"
                        >
                            Estimated duration (months)*
                        </label>
                        <input
                            id="hire-request-duration"
                            type="text"
                            inputMode="decimal"
                            value={durationMonths}
                            onChange={(event) => {
                                setDurationMonths(event.target.value);
                                clearError('durationMonths');
                            }}
                            required
                            aria-invalid={
                                errors.durationMonths ? true : undefined
                            }
                            aria-describedby={
                                errors.durationMonths
                                    ? 'hire-request-duration-error'
                                    : undefined
                            }
                            className={INPUT_CLASS}
                        />
                        <FieldError
                            message={errors.durationMonths}
                            id="hire-request-duration-error"
                        />
                    </div>
                </div>

                <FieldError message={formError} />

                <hr className="mt-4 border-line" />

                <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="h-[4vh] min-w-[80px] rounded-status bg-fill-muted px-6 type-sm font-[500] text-ink transition-colors hover:bg-line disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-[4vh] min-w-[80px] rounded-status bg-brand-dark px-6 type-sm font-[500] text-surface transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? 'Sending…' : 'Submit'}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
