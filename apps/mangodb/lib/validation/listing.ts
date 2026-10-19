// The rules a service and a job share, worded exactly as listingFields in
// apps/api/src/schemas/listing.schema.ts. One copy, so the two forms cannot
// drift from each other or from the API.

// The largest value a Postgres int4 column holds.
const INT4_MAX = 2_147_483_647;

export function validateListingTitle(value: string | undefined): string | null {
    const trimmed = (value ?? '').trim();
    if (!trimmed) return 'Title is required';
    if (trimmed.length > 255) return 'Title cannot exceed 255 characters';
    return null;
}

export function validateListingDesc(value: string | undefined): string | null {
    const trimmed = (value ?? '').trim();
    if (!trimmed) return 'Description is required';
    if (trimmed.length > 10000) {
        return 'Description cannot exceed 10000 characters';
    }
    return null;
}

export function validateCategoryIds(categoryIds: number[]): string | null {
    if (categoryIds.length > 10) return 'Cannot select more than 10 categories';
    return null;
}

type BudgetErrors = { minBudget?: string; maxBudget?: string };

// Budgets are whole baht from 0 to INT4_MAX. A job must name a maximum; a
// service may leave both boxes blank. The inputs stay strings so a half-typed
// value is not rewritten while the user types.
export function validateBudgets(
    minText: string,
    maxText: string,
    { maxRequired }: { maxRequired: boolean },
): BudgetErrors {
    const errors: BudgetErrors = {};
    const min = minText.trim() === '' ? null : Number(minText);
    const max = maxText.trim() === '' ? null : Number(maxText);

    if (min !== null) {
        if (!Number.isInteger(min)) {
            errors.minBudget = 'Minimum budget must be an integer';
        } else if (min < 0) {
            errors.minBudget = 'Minimum budget cannot be negative';
        } else if (min > INT4_MAX) {
            errors.minBudget = 'Minimum budget exceeds maximum allowed';
        }
    }

    if (max === null) {
        if (maxRequired) errors.maxBudget = 'Maximum budget is required';
    } else if (!Number.isInteger(max)) {
        errors.maxBudget = 'Maximum budget must be an integer';
    } else if (max <= 0) {
        errors.maxBudget = 'Maximum budget must be greater than zero';
    } else if (max > INT4_MAX) {
        errors.maxBudget = 'Maximum budget exceeds maximum allowed';
    }

    // Compared only when both sides are valid, so a box shows one problem.
    const bothValid = !errors.minBudget && !errors.maxBudget;
    if (bothValid && min !== null && max !== null && min > max) {
        errors.minBudget = 'Minimum budget cannot exceed maximum budget';
    }

    return errors;
}
