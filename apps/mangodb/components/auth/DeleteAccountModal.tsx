'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import binIcon from '@/assets/icons/bin.png';
import ConfirmModal, { type ConfirmModalBaseProps } from '../ui/ConfirmModal';

type DeleteAccountModalProps = Omit<ConfirmModalBaseProps, 'onConfirm'> & {
    expectedEmail: string;
    // The API re-checks the password before an irreversible delete.
    onConfirm?: (currentPassword: string) => void | Promise<void>;
};

export default function DeleteAccountModal({
    isOpen,
    ...props
}: DeleteAccountModalProps) {
    // Closing or switching accounts discards the previous confirmation.
    return isOpen ? (
        <DeleteAccountDialog key={props.expectedEmail} {...props} />
    ) : null;
}

function DeleteAccountDialog({
    expectedEmail,
    onConfirm,
    ...props
}: Omit<DeleteAccountModalProps, 'isOpen'>) {
    const emailId = useId();
    const passwordId = useId();
    const [confirmEmail, setConfirmEmail] = useState('');
    const [password, setPassword] = useState('');
    const normalizedEmail = expectedEmail.trim().toLowerCase();
    const isMatch =
        normalizedEmail.length > 0 &&
        confirmEmail.trim().toLowerCase() === normalizedEmail;

    return (
        <ConfirmModal
            {...props}
            isOpen
            title="Delete Account"
            layout="stacked"
            confirmLabel="Delete your account"
            confirmDisabled={!isMatch || password.length === 0}
            onConfirm={onConfirm ? () => onConfirm(password) : undefined}
            icon={
                <div className="w-[4.8vw] h-[4.8vw] min-w-[56px] min-h-[56px] max-w-[72px] max-h-[72px] rounded-full bg-danger-tint flex items-center justify-center">
                    <Image
                        src={binIcon}
                        alt=""
                        className="w-[2.4vw] h-[2.4vw] min-w-[28px] min-h-[28px] max-w-[36px] max-h-[36px] object-contain"
                    />
                </div>
            }
            description={
                <>
                    <p className="type-xs text-danger text-center mt-[0.8vh] leading-snug">
                        <strong className="!font-[700]">WARNING</strong> this is
                        permanent and
                        <br />
                        cannot be undone!
                    </p>
                    <p className="type-xs text-ink mt-[2.2vh] leading-relaxed">
                        You will lose access immediately and the account cannot
                        be restored. Other companies can no longer find or view
                        your profile, but your listings, proposals, projects,
                        and reviews are kept, so they keep the history that
                        depends on them.
                    </p>
                </>
            }
        >
            <div className="mt-[2.2vh]">
                <label
                    htmlFor={emailId}
                    className="block type-xs !font-[500] text-ink mb-[0.8vh]"
                >
                    Confirm email
                </label>
                <input
                    id={emailId}
                    type="email"
                    autoComplete="off"
                    required
                    value={confirmEmail}
                    onChange={(event) => setConfirmEmail(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') event.preventDefault();
                    }}
                    placeholder={`Type "${expectedEmail}" to confirm`}
                    className="w-full h-[3.8vh] min-h-[34px] px-3 rounded-[12px] border border-ink bg-transparent type-xs text-ink placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-ink disabled:opacity-60"
                />
                <label
                    htmlFor={passwordId}
                    className="block type-xs !font-[500] text-ink mt-[1.6vh] mb-[0.8vh]"
                >
                    Password
                </label>
                <input
                    id={passwordId}
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') event.preventDefault();
                    }}
                    className="w-full h-[3.8vh] min-h-[34px] px-3 rounded-[12px] border border-ink bg-transparent type-xs text-ink placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-ink disabled:opacity-60"
                />
            </div>
        </ConfirmModal>
    );
}
