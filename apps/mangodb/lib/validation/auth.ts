// Username (registration only): required, 3 to 50 characters, letters,
// numbers and underscores. Same rule as companyFields.username on the API.
export function validateUsername(value: string | undefined): string | null {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
        return 'Username is required.';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return 'Use letters, numbers, and underscores only.';
    }
    if (trimmed.length < 3) {
        return 'Username must be at least 3 characters.';
    }
    if (trimmed.length > 50) {
        return 'Username cannot exceed 50 characters.';
    }
    return null;
}

// Password (registration only): required, at least 8 characters. The byte
// cap is bcrypt's, so it counts bytes rather than characters — an emoji or a
// Thai character costs three of them.
export function validatePassword(value: string | undefined): string | null {
    const password = value ?? '';
    if (!password) {
        return 'Password is required.';
    }
    if (password.length < 8) {
        return 'Password must be at least 8 characters.';
    }
    if (new TextEncoder().encode(password).length > 72) {
        return 'Password must be at most 72 bytes.';
    }
    return null;
}

// Confirm password (registration only): must match the password above.
export function validateConfirmPassword(
    password: string | undefined,
    confirmPassword: string | undefined,
): string | null {
    if (!confirmPassword) {
        return 'Please confirm your password.';
    }
    if (password !== confirmPassword) {
        return 'Passwords do not match.';
    }
    return null;
}
