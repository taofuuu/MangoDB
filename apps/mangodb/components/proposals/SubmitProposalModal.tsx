'use client';

import { X } from 'lucide-react';
import { useId, useState } from 'react';
import type { JobPosting } from '@mangodb/shared';
import ModalShell from '@/components/ui/ModalShell';

// This is a UI draft, not the API request shape. T2.8.3 owns validation and
// T2.8.5 owns translating a valid draft into the proposal endpoint's body.
export type ProposalFormDraft = {
    proposalTerms: string;
    proposalBudget: string;
};

// JobPosting is the shared API shape. companyName is display-only information
// supplied by the job-posting detail view when it becomes available in US2-7.
export type ProposalJobPosting = Pick<
    JobPosting,
    'listingTitle' | 'minBudget' | 'maxBudget' | 'deadline' | 'locationPref'
> & {
    companyName: string;
};

type SubmitProposalModalProps = {
    isOpen: boolean;
    jobPosting: ProposalJobPosting;
    onClose: () => void;
    // The parent decides what submit means. Keeping this callback synchronous
    // prevents this field-layout task from adding API, loading, error, or
    // confirmation behavior owned by T2.8.3 and T2.8.5.
    onSubmit: (draft: ProposalFormDraft) => void;
};

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

function formatBudget(minBudget: number | null, maxBudget: number): string {
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
    ...props
}: SubmitProposalModalProps) {
    // ModalShell unmounts its dialog on close; returning nothing here also
    // resets this form's local field state each time it opens.
    return isOpen ? <SubmitProposalDialog {...props} /> : null;
}

function SubmitProposalDialog({
    jobPosting,
    onClose,
    onSubmit,
}: Omit<SubmitProposalModalProps, 'isOpen'>) {
    const titleId = useId();
    const descriptionId = useId();
    const [proposalTerms, setProposalTerms] = useState('');
    const [proposalBudget, setProposalBudget] = useState('');

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit({
            proposalTerms,
            proposalBudget,
        });
    };

    return (
        <ModalShell
            isOpen
            onClose={onClose}
            labelledBy={titleId}
            describedBy={descriptionId}
            backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-ink/10 p-4 sm:p-[2.6vh]"
            panelClassName="modal-scrollbar max-h-[72.22vh] w-full max-w-[44.58vw] overflow-y-auto rounded-popup bg-surface px-5 py-5 text-ink sm:px-7 sm:py-6"
        >
            <div className="flex items-center justify-between gap-4">
                <h2 id={titleId} className="type-hd">
                    Submit a proposal
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close proposal form"
                    className="flex size-8 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-ink-placeholder transition-colors hover:text-ink"
                >
                    <X aria-hidden="true" className="size-5" />
                </button>
            </div>

            <hr className="my-3 border-line" />

            <p id={descriptionId} className="type-md">
                You are submitting a proposal to this job posting.
            </p>

            <section aria-label="Job posting summary" className="mt-4">
                <h3 className="type-lg">{jobPosting.listingTitle}</h3>
                <p className="mt-1 type-md">
                    Posted by {jobPosting.companyName}
                </p>

                <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
                    <div>
                        <dt className="type-md text-ink-placeholder">Budget</dt>
                        <dd className="mt-1 type-md !font-[500] text-ink">
                            {formatBudget(
                                jobPosting.minBudget,
                                jobPosting.maxBudget,
                            )}
                        </dd>
                    </div>
                    <div>
                        <dt className="type-md text-ink-placeholder">
                            Deadline
                        </dt>
                        <dd className="mt-1 type-md !font-[500] text-ink">
                            {formatDeadline(jobPosting.deadline)}
                        </dd>
                    </div>
                    <div className="col-span-2">
                        <dt className="type-md text-ink-placeholder">
                            Location
                        </dt>
                        <dd className="mt-1 type-md !font-[500] text-ink">
                            {jobPosting.locationPref ?? 'Not specified'}
                        </dd>
                    </div>
                </dl>

                <p className="mt-4 type-md text-ink-soft">
                    <span className="text-ink">*</span> Indicates required
                </p>
            </section>

            <form onSubmit={handleSubmit} className="mt-4">
                <div className="space-y-4">
                    <div>
                        <label
                            htmlFor="proposal-terms"
                            className="mb-[0.93vh] block type-md leading-[1.15]"
                        >
                            Proposal terms*
                        </label>
                        <textarea
                            id="proposal-terms"
                            value={proposalTerms}
                            onChange={(event) =>
                                setProposalTerms(event.target.value)
                            }
                            className="custom-scrollbar block h-36 w-full resize-none rounded-input border-[0.75px] border-brand bg-surface-white px-[0.83vw] py-[1vh] type-sm text-ink focus:ring-1 focus:ring-brand focus:outline-none"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="proposal-budget"
                            className="mb-[0.93vh] block type-md leading-[1.15]"
                        >
                            Your quoted price*
                        </label>
                        <input
                            id="proposal-budget"
                            value={proposalBudget}
                            onChange={(event) =>
                                setProposalBudget(event.target.value)
                            }
                            type="text"
                            inputMode="decimal"
                            className="h-[4.79vh] w-full rounded-input border-[0.75px] border-brand bg-surface-white px-[0.83vw] type-sm text-ink focus:ring-1 focus:ring-brand focus:outline-none"
                        />
                    </div>
                </div>

                <div className="mt-5 flex justify-end">
                    <button
                        type="submit"
                        className="h-10 min-w-28 rounded-button bg-brand px-5 type-xs !font-[600] text-surface transition-colors hover:bg-brand-dark"
                    >
                        Add
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
