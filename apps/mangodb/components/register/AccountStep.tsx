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
    onChange: (value: AccountInfo) => void;
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

    useEffect(() => {
        onChange(accountInfo);
    }, [accountInfo]);

    return (
        <div className="account-info-page flex flex-col gap-5 my-5">
            <SimpleTextInput
                title="Username"
                onChange={handleUpdateUsername}
                initValue={value ? value.username : ''}
            />
            <ul className="mt-[-15px] list-disc pl-5 text-[12px] text-[#497B93]">
                <li>This will be used as your login username</li>
                <li>Cannot be changed after registration</li>
            </ul>
            <SimpleTextInput
                title="Password"
                type="password"
                onChange={handleUpdatePassword}
                initValue={value ? (value.password ?? '') : ''}
            />
            <ul className="mt-[-15px] list-disc pl-5 text-[12px] text-[#497B93]">
                <li>Must be at least 8 characters</li>
            </ul>
            <SimpleTextInput
                title="Confirm Password"
                type="password"
                onChange={handleUpdateConfirmPassword}
                initValue={value ? (value.confirmPassword ?? '') : ''}
            />
        </div>
    );
}
