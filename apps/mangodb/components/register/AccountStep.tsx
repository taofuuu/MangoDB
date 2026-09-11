'use client';

import { SimpleTextInput } from '@/components/sm-detail/SimpleTextInput';
import { useEffect, useState } from 'react';

export type AccountInfo = {
    username: string;
    password?: string;
    confirmPassword?: string;
};

type AccountInfoStepProps = {
    value: AccountInfo;
    onChange: (value: AccountInfo, isValid: boolean) => void;
};

export default function AccountInfoStep({
    value,
    onChange,
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

    const passwordsMatch =
        !!accountInfo.password &&
        accountInfo.password === accountInfo.confirmPassword;

    const isValid = !!accountInfo.username.trim() && passwordsMatch;

    useEffect(() => {
        onChange(accountInfo, isValid);
    }, [accountInfo, isValid]);

    return (
        <div className="account-info-page flex flex-col gap-5 my-5">
            <SimpleTextInput
                title="Username"
                onChange={handleUpdateUsername}
                initValue={value ? value.username : ''}
            />
            <div className="flex gap-4">
                <SimpleTextInput
                    title="Password"
                    onChange={handleUpdatePassword}
                    initValue={value ? (value.password ?? '') : ''}
                />
                <SimpleTextInput
                    title="Confirm Password"
                    onChange={handleUpdateConfirmPassword}
                    initValue={value ? (value.confirmPassword ?? '') : ''}
                />
            </div>
            {!passwordsMatch && accountInfo.confirmPassword && (
                <p className="text-sm text-red-500">Passwords do not match.</p>
            )}
        </div>
    );
}
