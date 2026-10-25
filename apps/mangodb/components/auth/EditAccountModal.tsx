'use client';

import { useId, useState } from 'react';
import FieldError from '@/components/ui/FieldError';
import Input from '@/components/ui/Input';
import ModalShell from '@/components/ui/ModalShell';
import PasswordInput from '@/components/ui/PasswordInput';
import { isNotSignedIn } from '@/lib/api';
import { toFormErrors, type FieldErrors } from '@/lib/validation/formErrors';

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

    const [errors, setErrors] = useState<AccountErrors>({});
    // Only what no input can hold: offline, or a 500.
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const titleId = useId();

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
            if (isNotSignedIn(err)) {
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
        <ModalShell
            isOpen
            onClose={onClose}
            // Not while a save is in flight: the request lands either way, and
            // closing would hide the error if it fails.
            isBusy={isSaving}
            labelledBy={titleId}
            backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            panelClassName="w-full max-w-[440px] rounded-xl bg-surface text-ink p-6 shadow-xl border border-line"
        >
            {/* Header */}
            <div>
                <h2 id={titleId} className="type-md font-semibold text-ink">
                    {modalTitles[mode]}
                </h2>
            </div>

            <hr className="border-brand-dark/30 my-3" />

            <p className="type-xs text-ink-soft mb-4">
                Enter your details below. Current password is required to
                confirm and apply changes.
            </p>

            {/* Keyed by mode, so each password box starts hidden again. */}
            <form key={mode} onSubmit={handleSubmit} className="space-y-4">
                {/* Username Mode */}
                {mode === 'username' && (
                    <Input
                        id="modal-username-input"
                        label={
                            <>
                                Username <span className="text-danger">*</span>
                            </>
                        }
                        value={inputValue}
                        onChange={(next) => {
                            setInputValue(next);
                            clearError('value');
                        }}
                        error={errors.value}
                        placeholder="Enter username"
                        variant="compact"
                        autoFocus
                    />
                )}

                {/* Email Mode */}
                {mode === 'email' && (
                    <Input
                        id="modal-email-input"
                        label={
                            <>
                                Email <span className="text-danger">*</span>
                            </>
                        }
                        type="email"
                        value={inputValue}
                        onChange={(next) => {
                            setInputValue(next);
                            clearError('value');
                        }}
                        error={errors.value}
                        placeholder="Enter email address"
                        variant="compact"
                        autoFocus
                    />
                )}

                {/* Password Mode */}
                {mode === 'password' && (
                    <>
                        <PasswordInput
                            id="modal-new-password-input"
                            label={
                                <>
                                    New Password{' '}
                                    <span className="text-danger">*</span>
                                </>
                            }
                            value={newPassword}
                            onChange={(next) => {
                                setNewPassword(next);
                                clearError('newPassword');
                            }}
                            error={errors.newPassword}
                            placeholder="Enter new password"
                            variant="compact"
                            autoFocus
                        />

                        <PasswordInput
                            id="modal-confirm-password-input"
                            label={
                                <>
                                    Confirm New Password{' '}
                                    <span className="text-danger">*</span>
                                </>
                            }
                            value={confirmPassword}
                            onChange={(next) => {
                                setConfirmPassword(next);
                                clearError('confirmPassword');
                            }}
                            error={errors.confirmPassword}
                            placeholder="Re-enter new password"
                            variant="compact"
                        />
                    </>
                )}

                {/* Security Check: Current Password */}
                <div className="pt-2 border-t border-line">
                    <PasswordInput
                        id="modal-current-password-input"
                        label={
                            <>
                                Current Password{' '}
                                <span className="text-danger">*</span>
                            </>
                        }
                        value={currentPassword}
                        onChange={(next) => {
                            setCurrentPassword(next);
                            clearError('currentPassword');
                        }}
                        error={errors.currentPassword}
                        placeholder="Enter current password"
                        variant="compact"
                    />
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
        </ModalShell>
    );
}
