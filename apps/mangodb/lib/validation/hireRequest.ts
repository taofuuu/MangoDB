import type { FieldErrors } from './formErrors';

export type HireRequestFormValues = {
    requestTerms: string;
    budget: string;
    durationMonths: string;
};

export type HireRequestErrors = FieldErrors<keyof HireRequestFormValues>;

// Mirrors the API's createProposalSchema (a hire request is a proposal on a
// service) and validateProposalForm. Numbers stay as strings so "1." is not
// rewritten while the user types.
export function validateHireRequestForm(
    values: HireRequestFormValues,
): HireRequestErrors {
    const errors: HireRequestErrors = {};
    const requestTerms = values.requestTerms.trim();
    const budget = values.budget.trim();
    const durationMonths = values.durationMonths.trim();

    if (!requestTerms) {
        errors.requestTerms = 'Request terms are required';
    } else if (requestTerms.length > 10_000) {
        errors.requestTerms = 'Request terms cannot exceed 10000 characters';
    }

    if (!budget) {
        errors.budget = 'Budget is required';
    } else {
        const amount = Number(budget);

        if (!Number.isFinite(amount)) {
            errors.budget = 'Budget must be a valid number';
        } else if (amount <= 0) {
            errors.budget = 'Budget must be greater than zero';
        } else if (amount > 9_999_999_999.99) {
            errors.budget = 'Budget exceeds maximum allowed';
        }
    }

    if (!durationMonths) {
        errors.durationMonths = 'Duration is required';
    } else {
        const duration = Number(durationMonths);

        if (!Number.isFinite(duration)) {
            errors.durationMonths = 'Duration must be a valid number';
        } else if (duration <= 0) {
            errors.durationMonths = 'Duration must be greater than zero';
        } else if (duration > 120) {
            errors.durationMonths = 'Duration cannot exceed 120 months';
        } else if (!Number.isInteger(duration * 2)) {
            errors.durationMonths =
                'Duration must be in half-month increments (e.g. 0.5, 1, 1.5)';
        }
    }

    return errors;
}
