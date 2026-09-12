'use client';

import { SimpleTextInput } from '@/components/sm-detail/SimpleTextInput';
import { useEffect, useState } from 'react';

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
    onChange: (value: AccountInfo) => void;
    errors?: AccountInfoError;
};

export default function AccountInfoStep({
    value,
    onChange,
    errors,
}: AccountInfoStepProps) {
    const [accountInfo, setAccountInfo] = useState<AccountInfo>(
        value ?? {
            username: '',

            password: '',

            confirmPassword: '',
        },
    );

    const handleUpdateUsername = (newUsername: string) => {
        setAccountInfo({ ...accountInfo, username: newUsername });
    };

    const handleUpdatePassword = (newPassword: string) => {
        setAccountInfo({ ...accountInfo, password: newPassword });
    };

    const handleUpdateConfirmPassword = (newConfirmPassword: string) => {
        setAccountInfo({ ...accountInfo, confirmPassword: newConfirmPassword });
    };

    useEffect(() => {
        onChange(accountInfo);
    }, [accountInfo]);

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
