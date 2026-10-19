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
