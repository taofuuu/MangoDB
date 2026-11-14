// US4-12: rejection feedback is required before the Receiver can return a
// delivered project to the Provider. Keep this in one place so the modal and
// its tests agree with the API's whitespace and length rules.
export function validateWorkRejectionReason(reason: string): string | null {
    const trimmed = reason.trim();

    if (!trimmed) {
        return 'Please enter a reason.';
    }

    if (trimmed.length > 10000) {
        return 'Reason cannot exceed 10000 characters.';
    }

    return null;
}
