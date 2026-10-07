'use client';

import { SimpleTextInput } from '@/components/sm-detail/SimpleTextInput';
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
    // The page's own state setter. Updating it directly, rather than through a
    // copy here, means a value reported on blur is in page state before the
    // click on Next that caused the blur is handled.
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
            <SimpleTextInput
                title="Username"
                onChange={handleUpdateUsername}
                initValue={value ? value.username : ''}
                error={errors?.usernameError || ''}
            />

            <SimpleTextInput
                title="Password"
                type="password"
                onChange={handleUpdatePassword}
                initValue={value ? (value.password ?? '') : ''}
                error={errors?.passwordError || ''}
            />

            <SimpleTextInput
                title="Confirm Password"
                type="password"
                onChange={handleUpdateConfirmPassword}
                initValue={value ? (value.confirmPassword ?? '') : ''}
                error={errors?.confirmPasswordError || ''}
            />
        </div>
    );
}
