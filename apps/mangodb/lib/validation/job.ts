export function validateJobTitle(value: string | undefined): string | null {
    const trimmed = (value ?? '').trim();

    if (!trimmed) {
        return 'Title is required';
    }

    if (trimmed.length > 255) {
        return 'Title cannot exceed 255 characters';
    }

    return null;
}

export function validateJobDescription(
    value: string | undefined,
): string | null {
    const trimmed = (value ?? '').trim();

    if (!trimmed) {
        return 'Description is required';
    }

    if (trimmed.length > 10000) {
        return 'Description cannot exceed 10000 characters';
    }

    return null;
}

export function validateJobBudgets(
    minStr: string,
    maxStr: string,
): { minBudget?: string; maxBudget?: string } {
    const errors: { minBudget?: string; maxBudget?: string } = {};

    const minValue = minStr.trim();
    const maxValue = maxStr.trim();

    const min = minValue !== '' ? Number(minValue) : undefined;
    const max = maxValue !== '' ? Number(maxValue) : undefined;

    // minBudget: optional, nullable, integer, 0 to INT4_MAX
    if (min !== undefined) {
        if (!Number.isInteger(min)) {
            errors.minBudget = 'Minimum budget must be an integer';
        } else if (min < 0) {
            errors.minBudget = 'Minimum budget cannot be negative';
        } else if (min > 2147483647) {
            errors.minBudget = 'Minimum budget exceeds maximum allowed';
        }
    }

    // maxBudget: required, positive integer, at most INT4_MAX
    if (maxValue === '') {
        errors.maxBudget = 'Maximum budget is required';
    } else if (!Number.isFinite(max)) {
        errors.maxBudget = 'Maximum budget must be a number';
    } else if (!Number.isInteger(max)) {
        errors.maxBudget = 'Maximum budget must be an integer';
    } else if (max! <= 0) {
        errors.maxBudget = 'Maximum budget must be greater than zero';
    } else if (max! > 2147483647) {
        errors.maxBudget = 'Maximum budget exceeds maximum allowed';
    }

    // minBudget must not exceed maxBudget
    if (
        min !== undefined &&
        max !== undefined &&
        Number.isInteger(min) &&
        Number.isInteger(max) &&
        min >= 0 &&
        max > 0 &&
        min <= 2147483647 &&
        max <= 2147483647 &&
        min > max
    ) {
        errors.minBudget = 'Minimum budget cannot exceed maximum budget';
    }

    return errors;
}

export function validateJobLocation(value: string | undefined): string | null {
    if ((value ?? '').trim().length > 100) {
        return 'Location preference cannot exceed 100 characters';
    }

    return null;
}

export function validateJobDuration(value: string | undefined): string | null {
    if ((value ?? '').trim().length > 100) {
        return 'Duration cannot exceed 100 characters';
    }

    return null;
}

export function validateJobDeadline(value: string | undefined): string | null {
    const trimmed = (value ?? '').trim();

    // deadline is optional and nullable
    if (!trimmed) {
        return null;
    }

    // Validate YYYY-MM-DD and ensure the date actually exists
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return 'Deadline must be in YYYY-MM-DD format';
    }

    const date = new Date(`${trimmed}T00:00:00Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== trimmed
    ) {
        return 'Deadline must be in YYYY-MM-DD format';
    }

    // Match isDeadlineInFutureOrToday on the backend
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(`${trimmed}T00:00:00`);

    if (deadline < today) {
        return 'Deadline cannot be in the past';
    }

    return null;
}

export function validateJobCategory(categoryIds: number[]): string | null {
    if (categoryIds.length > 10) {
        return 'Cannot select more than 10 categories';
    }

    return null;
}
