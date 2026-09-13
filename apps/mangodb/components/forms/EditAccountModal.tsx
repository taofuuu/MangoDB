'use client';

import { useState } from 'react';
import FieldError from '@/components/ui/FieldError';
import { ApiRequestError } from '@/lib/api';
import { toFormErrors, type FieldErrors } from '@/lib/validation';

export type EditAccountMode = 'username' | 'email' | 'password';

// The four inputs this modal can show, across its three modes. `value` is
// whichever of username/email the mode is editing.
type AccountField =
    'value' | 'newPassword' | 'confirmPassword' | 'currentPassword';

type AccountErrors = FieldErrors<AccountField>;

// Which input an API-rejected field belongs under. currentPassword is what a
// wrong-password 401 names, and it is the one field every mode shows.
const ACCOUNT_FIELDS: Record<string, AccountField> = {
    username: 'value',
    email: 'value',
    newPassword: 'newPassword',
    password: 'newPassword',
    currentPassword: 'currentPassword',
};

// The last fallback, for a failure that carries no message of its own.
const FAILURES: Record<EditAccountMode, string> = {
    username: 'Failed to update username.',
    email: 'Failed to update email.',
    password: 'Failed to change password.',
};

function EyeIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M4 14.5a8 8 0 0 1 16 0" />
            <circle cx="12" cy="14.5" r="3.5" />
        </svg>
    );
}

type EditAccountModalProps = {
    isOpen: boolean;
    mode: EditAccountMode;
    currentValue?: string;
    onClose: () => void;
    onSave?: (data: {
        mode: EditAccountMode;
        newValue: string;
        currentPassword: string;
    }) => void | Promise<void>;
};

export default function EditAccountModal({
    isOpen,
    mode,
    currentValue = '',
    onClose,
    onSave,
}: EditAccountModalProps) {
    const [inputValue, setInputValue] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [errors, setErrors] = useState<AccountErrors>({});
    // Only what no input can hold: offline, or a 500.
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Touching a box clears what was wrong with it, so a field the user has
    // already fixed stops looking broken.
    const clearError = (field: AccountField) =>
        setErrors((prev) => ({ ...prev, [field]: undefined }));

    // Reset fields on open or mode switch. Adjusted during render rather than
    // in an effect: an effect would paint the previous mode's values once
    // before correcting them.
    const [lastOpened, setLastOpened] = useState({
        isOpen,
        mode,
        currentValue,
    });
    if (
        lastOpened.isOpen !== isOpen ||
        lastOpened.mode !== mode ||
        lastOpened.currentValue !== currentValue
    ) {
        setLastOpened({ isOpen, mode, currentValue });
        if (isOpen) {
            setInputValue(currentValue);
            setNewPassword('');
            setConfirmPassword('');
            setCurrentPassword('');
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            setErrors({});
            setFormError(null);
            setIsSaving(false);
        }
    }

    if (!isOpen) return null;

    const modalTitles: Record<EditAccountMode, string> = {
        username: 'Edit Username',
        email: 'Edit Email',
        password: 'Change Password',
    };

    // Checks the fields this mode uses and returns what to send, or null after
    // putting the reason on screen. The server checks all of this again — this
    // is only here to save a round trip on what the user can see is wrong.
    const nextValue = (): string | null => {
        if (mode === 'password') {
            if (!newPassword) {
                setErrors({ newPassword: 'Please enter a new password.' });
                return null;
            }
            // Matches the API's minimum, so the rule is not first learned from
            // a 400.
            if (newPassword.length < 8) {
                setErrors({
                    newPassword: 'New password must be at least 8 characters.',
                });
                return null;
            }
            if (!confirmPassword) {
                setErrors({
                    confirmPassword: 'Please confirm your new password.',
                });
                return null;
            }
            if (newPassword !== confirmPassword) {
                setErrors({
                    confirmPassword:
                        'New password and confirmation do not match.',
                });
                return null;
            }
            return newPassword;
        }

        const trimmed = inputValue.trim();

        if (mode === 'username') {
            if (!trimmed) {
                setErrors({ value: 'Username cannot be empty.' });
                return null;
            }
            if (trimmed === currentValue) {
                setErrors({
                    value: 'New username must be different from current username.',
                });
                return null;
            }
            return trimmed;
        }

        if (!trimmed) {
            setErrors({ value: 'Email address cannot be empty.' });
            return null;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setErrors({ value: 'Please enter a valid email address.' });
            return null;
        }
        if (trimmed.toLowerCase() === currentValue.toLowerCase()) {
            setErrors({
                value: 'New email must be different from current email.',
            });
            return null;
        }
        return trimmed;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setFormError(null);

        // Required for all three: each one changes what the account signs in
        // with, and the API rejects the request without it.
        if (!currentPassword) {
            setErrors({
                currentPassword:
                    'Current password is required to save changes.',
            });
            return;
        }

        const newValue = nextValue();
        if (newValue === null) return;

        // Hashing runs at bcrypt cost 12, so the save is slow enough to click
        // twice. The second request would fail anyway — saving rotates the
        // token — so block it here rather than explain it afterwards.
        setIsSaving(true);
        try {
            await onSave?.({ mode, newValue, currentPassword });
            onClose();
        } catch (err: unknown) {
            const { fields, message } = toFormErrors(err, ACCOUNT_FIELDS);

            // A 401 names no field, but on this endpoint it means one thing:
            // the current password was wrong. So it goes under that box.
            if (err instanceof ApiRequestError && err.status === 401) {
                setErrors({ currentPassword: message ?? FAILURES[mode] });
            } else {
                setErrors(fields);
                setFormError(
                    Object.keys(fields).length > 0
                        ? null
                        : (message ?? FAILURES[mode]),
                );
            }
            setIsSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(e) => {
                // Not while a save is in flight: the request lands either way,
                // and closing here would hide the error if it fails.
                if (e.target === e.currentTarget && !isSaving) {
                    onClose();
                }
            }}
        >
            <div className="w-full max-w-[440px] rounded-xl bg-surface text-ink p-6 shadow-xl border border-gray-100">
                {/* Header */}
                <div>
                    <h2 className="type-md font-semibold text-ink">
                        {modalTitles[mode]}
                    </h2>
                </div>

                <hr className="border-brand-dark/30 my-3" />

                <p className="type-xs text-ink-soft mb-4">
                    Enter your details below. Current password is required to
                    confirm and apply changes.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username Mode */}
                    {mode === 'username' && (
                        <div>
                            <label
                                htmlFor="modal-username-input"
                                className="block type-xs font-medium text-ink mb-1"
                            >
                                Username <span className="text-danger">*</span>
                            </label>
                            <input
                                id="modal-username-input"
                                type="text"
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    clearError('value');
                                }}
                                placeholder="Enter username"
                                className="h-[38px] w-full px-3 rounded-input border border-brand bg-white type-xs text-ink placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-brand"
                                autoFocus
                            />
                            <FieldError message={errors.value} />
                        </div>
                    )}

                    {/* Email Mode */}
                    {mode === 'email' && (
                        <div>
                            <label
                                htmlFor="modal-email-input"
                                className="block type-xs font-medium text-ink mb-1"
                            >
                                Email <span className="text-danger">*</span>
                            </label>
                            <input
                                id="modal-email-input"
                                type="email"
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    clearError('value');
                                }}
                                placeholder="Enter email address"
                                className="h-[38px] w-full px-3 rounded-input border border-brand bg-white type-xs text-ink placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-brand"
                                autoFocus
                            />
                            <FieldError message={errors.value} />
                        </div>
                    )}

                    {/* Password Mode */}
                    {mode === 'password' && (
                        <>
                            <div>
                                <label
                                    htmlFor="modal-new-password-input"
                                    className="block type-xs font-medium text-ink mb-1"
                                >
                                    New Password{' '}
                                    <span className="text-danger">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="modal-new-password-input"
                                        type={
                                            showNewPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            clearError('newPassword');
                                        }}
                                        placeholder="Enter new password"
                                        className="h-[38px] w-full px-3 pr-10 rounded-input border border-brand bg-white type-xs text-ink placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-brand"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowNewPassword(!showNewPassword)
                                        }
                                        aria-label={
                                            showNewPassword
                                                ? 'Hide password'
                                                : 'Show password'
                                        }
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-soft hover:text-ink transition-colors cursor-pointer rounded"
                                    >
                                        <EyeIcon
                                            className={`w-4 h-4 ${
                                                showNewPassword
                                                    ? 'text-ink'
                                                    : 'text-ink-placeholder'
                                            }`}
                                        />
                                    </button>
                                </div>
                                <FieldError message={errors.newPassword} />
                            </div>

                            <div>
                                <label
                                    htmlFor="modal-confirm-password-input"
                                    className="block type-xs font-medium text-ink mb-1"
                                >
                                    Confirm New Password{' '}
                                    <span className="text-danger">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="modal-confirm-password-input"
                                        type={
                                            showConfirmPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            clearError('confirmPassword');
                                        }}
                                        placeholder="Re-enter new password"
                                        className="h-[38px] w-full px-3 pr-10 rounded-input border border-brand bg-white type-xs text-ink placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-brand"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                !showConfirmPassword,
                                            )
                                        }
                                        aria-label={
                                            showConfirmPassword
                                                ? 'Hide password'
                                                : 'Show password'
                                        }
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-soft hover:text-ink transition-colors cursor-pointer rounded"
                                    >
                                        <EyeIcon
                                            className={`w-4 h-4 ${
                                                showConfirmPassword
                                                    ? 'text-ink'
                                                    : 'text-ink-placeholder'
                                            }`}
                                        />
                                    </button>
                                </div>
                                <FieldError message={errors.confirmPassword} />
                            </div>
                        </>
                    )}

                    {/* Security Check: Current Password */}
                    <div className="pt-2 border-t border-gray-200">
                        <label
                            htmlFor="modal-current-password-input"
                            className="block type-xs font-medium text-ink mb-1"
                        >
                            Current Password{' '}
                            <span className="text-danger">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="modal-current-password-input"
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => {
                                    setCurrentPassword(e.target.value);
                                    clearError('currentPassword');
                                }}
                                placeholder="Enter current password"
                                className="h-[38px] w-full px-3 pr-10 rounded-input border border-brand bg-white type-xs text-ink placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    setShowCurrentPassword(!showCurrentPassword)
                                }
                                aria-label={
                                    showCurrentPassword
                                        ? 'Hide password'
                                        : 'Show password'
                                }
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-soft hover:text-ink transition-colors cursor-pointer rounded"
                            >
                                <EyeIcon
                                    className={`w-4 h-4 ${
                                        showCurrentPassword
                                            ? 'text-ink'
                                            : 'text-ink-placeholder'
                                    }`}
                                />
                            </button>
                        </div>
                        <FieldError message={errors.currentPassword} />
                    </div>

                    <FieldError message={formError} />

                    {/* Footer buttons */}
                    <div className="pt-3 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="rounded-status border border-brand px-5 py-2 type-xs font-semibold text-brand hover:bg-brand/10 transition-colors cursor-pointer min-h-[36px] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-status bg-brand-dark px-6 py-2 type-xs font-semibold text-surface hover:bg-brand-darker transition-colors cursor-pointer min-h-[36px] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
