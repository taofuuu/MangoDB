'use client';

import type { ChangeEvent, FormEvent } from 'react';

export type AccountInfo = {
    username: string;
    password: string;
    confirmPassword: string;
};

type UsernameAvailability = 'idle' | 'checking' | 'available' | 'taken';

type AccountStepProps = {
    value: AccountInfo;
    onChange: (next: AccountInfo) => void;
    usernameAvailability: UsernameAvailability;
    serverError: string;
    isSubmitting: boolean;
    onUsernameBlur: () => void;
    onBack?: () => void;
    onSubmit: () => void;
};

export default function AccountStep({
    value,
    onChange,
    usernameAvailability,
    serverError,
    isSubmitting,
    onUsernameBlur,
    onBack,
    onSubmit,
}: AccountStepProps) {
    const update = (field: keyof AccountInfo, nextValue: string) => {
        onChange({ ...value, [field]: nextValue });
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit();
    };

    const passwordValid =
        value.password.length >= 8 && value.password.length <= 72;
    const confirmValid =
        value.password === value.confirmPassword &&
        value.confirmPassword.length > 0;
    const canSubmit =
        passwordValid &&
        confirmValid &&
        usernameAvailability === 'available' &&
        !isSubmitting;

    return (
        <form onSubmit={submit} className="flex flex-col px-7 py-5 sm:px-10">
            <div className="w-full max-w-[420px] space-y-5">
                <div>
                    <label htmlFor="username" className="mb-2 block text-base">
                        Username
                    </label>
                    <input
                        id="username"
                        name="username"
                        value={value.username}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            update('username', event.target.value.toLowerCase())
                        }
                        onBlur={onUsernameBlur}
                        maxLength={50}
                        autoComplete="username"
                        className={`h-[46px] w-full rounded-md border bg-white/50 px-4 outline-none transition focus:ring-2 ${
                            usernameAvailability === 'taken'
                                ? 'border-[#C5483B] focus:ring-[#C5483B]/30'
                                : 'border-[#497B93] focus:ring-[#66A6C5]'
                        }`}
                    />
                    {/* <p className="mt-2 text-sm leading-6 text-[#497B93]">
                        This will be used as your login username. Cannot be
                        changed after registration.
                    </p> */}
                    {usernameAvailability === 'checking' && (
                        <p className="mt-1 text-xs text-[#497B93]">
                            Checking username…
                        </p>
                    )}
                    {/* {usernameAvailability === 'available' && (
                        <p className="mt-1 text-xs text-[#2F7D47]">
                            Username is available.
                        </p>
                    )}
                    {usernameAvailability === 'taken' && (
                        <p className="mt-1 text-xs text-[#C5483B]">
                            ⚠ Username already taken. Please choose another one.
                        </p>
                    )} */}
                </div>

                <PasswordField
                    id="password"
                    label="Password"
                    value={value.password}
                    onChange={(nextValue) => update('password', nextValue)}
                />
                <p className="-mt-3 text-sm leading-6 text-[#497B93]">
                    Must be at least 8 characters. Maximum 72 characters.
                </p>

                <PasswordField
                    id="confirmPassword"
                    label="Confirm Password"
                    value={value.confirmPassword}
                    onChange={(nextValue) =>
                        update('confirmPassword', nextValue)
                    }
                />
                {value.confirmPassword.length > 0 && !confirmValid && (
                    <p className="-mt-3 text-xs text-[#C5483B]">
                        ⚠ Passwords do not match.
                    </p>
                )}
            </div>

            {serverError && (
                <p className="mt-3 max-w-[520px] text-sm text-[#C5483B]">
                    ⚠ {serverError}
                </p>
            )}

            {/* <div className="mt-auto flex justify-end gap-4 pt-8">
                <button
                    type="button"
                    onClick={onBack}
                    className="rounded-[20px] border border-[#497B93] px-7 py-2 text-base font-semibold text-[#497B93] hover:bg-[#497B93]/10"
                >
                    Back
                </button>
                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-[20px] bg-[#497B93] px-7 py-2 text-lg font-bold text-white shadow-[2px_4px_4px_rgba(0,0,0,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {isSubmitting ? 'Creating…' : 'Create Account'}
                </button>
            </div> */}
        </form>
    );
}

function PasswordField({
    id,
    label,
    value,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-base">
                {label}
            </label>
            <input
                id={id}
                name={id}
                type="password"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                autoComplete={
                    id === 'password' ? 'new-password' : 'new-password'
                }
                className="h-[46px] w-full rounded-md border border-[#497B93] bg-white/50 px-4 outline-none transition focus:ring-2 focus:ring-[#66A6C5]"
            />
        </div>
    );
}
