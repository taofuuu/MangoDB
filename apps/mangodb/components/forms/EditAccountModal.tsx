'use client';

import { useState } from 'react';

export type EditAccountMode = 'username' | 'email' | 'password';

// Only reached when a save rejects with something that is not an Error, which
// means the caller threw a value rather than the API refusing the change.
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

    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

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
            setError(null);
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
                setError('Please enter a new password.');
                return null;
            }
            // Matches the API's minimum, so the rule is not first learned from
            // a 400.
            if (newPassword.length < 8) {
                setError('New password must be at least 8 characters.');
                return null;
            }
            if (!confirmPassword) {
                setError('Please confirm your new password.');
                return null;
            }
            if (newPassword !== confirmPassword) {
                setError('New password and confirmation do not match.');
                return null;
            }
            return newPassword;
        }

        const trimmed = inputValue.trim();

        if (mode === 'username') {
            if (!trimmed) {
                setError('Username cannot be empty.');
                return null;
            }
            if (trimmed === currentValue) {
                setError(
                    'New username must be different from current username.',
                );
                return null;
            }
            return trimmed;
        }

        if (!trimmed) {
            setError('Email address cannot be empty.');
            return null;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setError('Please enter a valid email address.');
            return null;
        }
        if (trimmed.toLowerCase() === currentValue.toLowerCase()) {
            setError('New email must be different from current email.');
            return null;
        }
        return trimmed;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Required for all three: each one changes what the account signs in
        // with, and the API rejects the request without it.
        if (!currentPassword) {
            setError('Current password is required to save changes.');
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
            setError(err instanceof Error ? err.message : FAILURES[mode]);
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
            <div className="w-full max-w-[440px] rounded-xl bg-[#FFFDF9] text-[#171717] p-6 shadow-xl border border-gray-100">
                {/* Header */}
                <div>
                    <h2 className="text-md font-semibold text-[#171717]">
                        {modalTitles[mode]}
                    </h2>
                </div>

                <hr className="border-[#3F6B80]/30 my-3" />

                <p className="text-xs text-[#666666] mb-4">
                    Enter your details below. Current password is required to
                    confirm and apply changes.
                </p>

                {error && (
                    <div className="mb-4 rounded-lg border border-[#CE473E]/30 bg-red-50 p-3 text-xs font-medium text-[#CE473E]">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username Mode */}
                    {mode === 'username' && (
                        <div>
                            <label
                                htmlFor="modal-username-input"
                                className="block text-xs font-medium text-[#171717] mb-1"
                            >
                                Username{' '}
                                <span className="text-[#CE473E]">*</span>
                            </label>
                            <input
                                id="modal-username-input"
                                type="text"
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    if (error) setError(null);
                                }}
                                placeholder="Enter username"
                                className="h-[38px] w-full px-3 rounded-input border border-[#497B93] bg-white text-xs text-[#171717] placeholder:text-[#999999] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Email Mode */}
                    {mode === 'email' && (
                        <div>
                            <label
                                htmlFor="modal-email-input"
                                className="block text-xs font-medium text-[#171717] mb-1"
                            >
                                Email <span className="text-[#CE473E]">*</span>
                            </label>
                            <input
                                id="modal-email-input"
                                type="email"
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    if (error) setError(null);
                                }}
                                placeholder="Enter email address"
                                className="h-[38px] w-full px-3 rounded-input border border-[#497B93] bg-white text-xs text-[#171717] placeholder:text-[#999999] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Password Mode */}
                    {mode === 'password' && (
                        <>
                            <div>
                                <label
                                    htmlFor="modal-new-password-input"
                                    className="block text-xs font-medium text-[#171717] mb-1"
                                >
                                    New Password{' '}
                                    <span className="text-[#CE473E]">*</span>
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
                                            if (error) setError(null);
                                        }}
                                        placeholder="Enter new password"
                                        className="h-[38px] w-full px-3 pr-10 rounded-input border border-[#497B93] bg-white text-xs text-[#171717] placeholder:text-[#999999] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
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
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#666666] hover:text-[#171717] transition-colors cursor-pointer rounded"
                                    >
                                        <EyeIcon
                                            className={`w-4 h-4 ${
                                                showNewPassword
                                                    ? 'text-[#171717]'
                                                    : 'text-[#828282]'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="modal-confirm-password-input"
                                    className="block text-xs font-medium text-[#171717] mb-1"
                                >
                                    Confirm New Password{' '}
                                    <span className="text-[#CE473E]">*</span>
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
                                            if (error) setError(null);
                                        }}
                                        placeholder="Re-enter new password"
                                        className="h-[38px] w-full px-3 pr-10 rounded-input border border-[#497B93] bg-white text-xs text-[#171717] placeholder:text-[#999999] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
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
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#666666] hover:text-[#171717] transition-colors cursor-pointer rounded"
                                    >
                                        <EyeIcon
                                            className={`w-4 h-4 ${
                                                showConfirmPassword
                                                    ? 'text-[#171717]'
                                                    : 'text-[#828282]'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Security Check: Current Password */}
                    <div className="pt-2 border-t border-gray-200">
                        <label
                            htmlFor="modal-current-password-input"
                            className="block text-xs font-medium text-[#171717] mb-1"
                        >
                            Current Password{' '}
                            <span className="text-[#CE473E]">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="modal-current-password-input"
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => {
                                    setCurrentPassword(e.target.value);
                                    if (error) setError(null);
                                }}
                                placeholder="Enter current password"
                                className="h-[38px] w-full px-3 pr-10 rounded-input border border-[#497B93] bg-white text-xs text-[#171717] placeholder:text-[#999999] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
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
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#666666] hover:text-[#171717] transition-colors cursor-pointer rounded"
                            >
                                <EyeIcon
                                    className={`w-4 h-4 ${
                                        showCurrentPassword
                                            ? 'text-[#171717]'
                                            : 'text-[#828282]'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Footer buttons */}
                    <div className="pt-3 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="rounded-status border border-[#497B93] px-5 py-2 text-xs font-semibold text-[#497B93] hover:bg-[#497B93]/10 transition-colors cursor-pointer min-h-[36px] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-status bg-[#3F6B80] px-6 py-2 text-xs font-semibold text-[#FFFDF9] hover:bg-[#34596b] transition-colors cursor-pointer min-h-[36px] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
