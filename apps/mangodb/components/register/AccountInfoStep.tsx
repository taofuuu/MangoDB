'use client';

import Input from '@/components/ui/Input';
import PasswordInput from '@/components/ui/PasswordInput';
import type { Dispatch, SetStateAction } from 'react';

export type AccountInfo = {
    username: string;
    password?: string;
    confirmPassword?: string;
};
export type AccountInfoError = {
    usernameError?: string;
    passwordError?: string;
    confirmPasswordError?: string;
};

type AccountInfoStepProps = {
    value: AccountInfo;
    // The page's own state setter. Every keystroke lands in page state, so
    // Next always reads the latest value.
    onChange: Dispatch<SetStateAction<AccountInfo>>;
    errors?: AccountInfoError;
};

export default function AccountInfoStep({
    value,
    onChange,
    errors,
}: AccountInfoStepProps) {
    // Functional updates: several fields can report in the same moment (fast
    // typing, autofill), and copying `value` from this render would let
    // each one overwrite the others with stale values.
    const handleUpdateUsername = (newUsername: string) => {
        onChange((prev) => ({ ...prev, username: newUsername }));
    };

    const handleUpdatePassword = (newPassword: string) => {
        onChange((prev) => ({ ...prev, password: newPassword }));
    };

    const handleUpdateConfirmPassword = (newConfirmPassword: string) => {
        onChange((prev) => ({
            ...prev,
            confirmPassword: newConfirmPassword,
        }));
    };

    return (
        <div className="account-info-page flex flex-col gap-5 my-5">
            <Input
                label="Username"
                value={value.username ?? ''}
                onChange={handleUpdateUsername}
                error={errors?.usernameError}
                placeholder="Type here..."
            />

            <PasswordInput
                label="Password"
                value={value.password ?? ''}
                onChange={handleUpdatePassword}
                error={errors?.passwordError}
                placeholder="Type here..."
            />

            <PasswordInput
                label="Confirm Password"
                value={value.confirmPassword ?? ''}
                onChange={handleUpdateConfirmPassword}
                error={errors?.confirmPasswordError}
                placeholder="Type here..."
            />
        </div>
    );
}
