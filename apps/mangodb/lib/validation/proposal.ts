import type { FieldErrors } from './formErrors';

export type ProposalFormValues = {
    proposalTerms: string;
    proposalBudget: string;
    estimatedDurationMonths: string;
};

export type ProposalErrors = FieldErrors<keyof ProposalFormValues>;

// Proposal validation mirrors the API boundary while keeping the form usable
// during editing. Numeric fields stay as strings in the UI so an unfinished
// value such as "1." is not rewritten while typing.
export function validateProposalForm(
    values: ProposalFormValues,
): ProposalErrors {
    const errors: ProposalErrors = {};
    const proposalTerms = values.proposalTerms.trim();
    const proposalBudget = values.proposalBudget.trim();
    const estimatedDurationMonths = values.estimatedDurationMonths.trim();

    if (!proposalTerms) {
        errors.proposalTerms = 'Proposal terms are required';
    } else if (proposalTerms.length > 10_000) {
        errors.proposalTerms = 'Proposal terms cannot exceed 10000 characters';
    }

    if (!proposalBudget) {
        errors.proposalBudget = 'Proposal budget is required';
    } else {
        const budget = Number(proposalBudget);

        if (!Number.isFinite(budget)) {
            errors.proposalBudget = 'Proposal budget must be a valid number';
        } else if (budget <= 0) {
            errors.proposalBudget = 'Proposal budget must be greater than zero';
        } else if (budget > 9_999_999_999.99) {
            errors.proposalBudget = 'Proposal budget exceeds maximum allowed';
        }
    }

    if (!estimatedDurationMonths) {
        errors.estimatedDurationMonths = 'Duration is required';
    } else {
        const duration = Number(estimatedDurationMonths);

        if (!Number.isFinite(duration)) {
            errors.estimatedDurationMonths = 'Duration must be a valid number';
        } else if (duration <= 0) {
            errors.estimatedDurationMonths =
                'Duration must be greater than zero';
        } else if (duration > 120) {
            errors.estimatedDurationMonths =
                'Duration cannot exceed 120 months';
        } else if (!Number.isInteger(duration * 2)) {
            errors.estimatedDurationMonths =
                'Duration must be in half-month increments (e.g. 0.5, 1, 1.5)';
        }
    }

    return errors;
}
