'use client';

import type { ChangeEvent, FormEvent } from 'react';

export type AccountInfo = {
    username: string;
    password: string;
    confirmPassword: string;
};

type UsernameAvailability = 'idle' | 'checking' | 'available' | 'taken';

type AccountStepErrors = {
    username?: string;
    password?: string;
    confirmPassword?: string;
};

type AccountStepProps = {
    value: AccountInfo;
    onChange: (next: AccountInfo) => void;
    usernameAvailability: UsernameAvailability;
    serverError: string;
    isSubmitting: boolean;
    onUsernameBlur: () => void;
    onBack?: () => void;
    onSubmit: () => void;
    errors?: AccountStepErrors;
    onClearError?: (field: keyof AccountInfo) => void;
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
    errors,
    onClearError,
}: AccountStepProps) {
    const update = (field: keyof AccountInfo, nextValue: string) => {
        onChange({ ...value, [field]: nextValue });
        if (errors?.[field]) {
            onClearError?.(field);
        }
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit();
    };

    return (
        <form onSubmit={submit} className="flex flex-col py-5">
            <div className="w-full max-w-[420px] space-y-5">
                <div>
                    <label
                        htmlFor="username"
                        className="mb-[3px] block text-sm"
                    >
                        Username
                        <span className="ml-1 text-[#C5483B]">*</span>
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
                        className={`h-[40px] w-full rounded-[6px] border bg-[#FFFDF9] px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 ease-in-out ${
                            errors?.username || usernameAvailability === 'taken'
                                ? 'border-[#C5483B] focus:ring-2 focus:ring-[#C5483B]/30'
                                : 'border-[#497B93] focus:ring-2 focus:ring-[#497B93]/30'
                        }`}
                    />
                    {errors?.username && (
                        <p className="mt-1 text-xs text-[#C5483B]">
                            {errors.username}
                        </p>
                    )}
                    <p className="mt-2 text-sm leading-6 text-[#497B93]">
                        This will be used as your login username. Cannot be
                        changed after registration.
                    </p>
                    {usernameAvailability === 'checking' && (
                        <p className="mt-1 text-sm text-[#497B93]">
                            Checking username…
                        </p>
                    )}
                </div>

                <PasswordField
                    id="password"
                    label="Password"
                    value={value.password}
                    onChange={(nextValue) => update('password', nextValue)}
                    error={errors?.password}
                    required
                />

                <PasswordField
                    id="confirmPassword"
                    label="Confirm Password"
                    value={value.confirmPassword}
                    onChange={(nextValue) =>
                        update('confirmPassword', nextValue)
                    }
                    error={errors?.confirmPassword}
                    required
                />
            </div>

            {serverError && (
                <p className="mt-3 max-w-[520px] text-sm text-[#C5483B]">
                    ⚠ {serverError}
                </p>
            )}
        </form>
    );
}

function PasswordField({
    id,
    label,
    value,
    onChange,
    error,
    required,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label htmlFor={id} className="mb-[3px] block text-sm">
                {label}
                {required && <span className="ml-1 text-[#C5483B]">*</span>}
            </label>
            <input
                id={id}
                name={id}
                type="password"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                autoComplete="new-password"
                className={`h-[40px] w-full rounded-[6px] border bg-[#FFFDF9] px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 ease-in-out ${
                    error
                        ? 'border-[#C5483B] focus:ring-2 focus:ring-[#C5483B]/30'
                        : 'border-[#497B93] focus:ring-2 focus:ring-[#497B93]/30'
                }`}
            />
            {error && <p className="mt-1 text-xs text-[#C5483B]">{error}</p>}
        </div>
    );
}
