'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import binIcon from '@/assets/icons/bin.png';
import DeleteConfirmationModal, {
    type DeleteModalProps,
} from './DeleteConfirmationModal';

type DeleteAccountModalProps = Omit<DeleteModalProps, 'onConfirm'> & {
    expectedEmail: string;
    onConfirm?: (confirmedEmail: string) => void | Promise<void>;
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
    const [confirmEmail, setConfirmEmail] = useState('');
    const normalizedEmail = expectedEmail.trim().toLowerCase();
    const isMatch =
        normalizedEmail.length > 0 &&
        confirmEmail.trim().toLowerCase() === normalizedEmail;

    return (
        <DeleteConfirmationModal
            {...props}
            isOpen
            title="Delete Account"
            layout="stacked"
            confirmLabel="Delete your account"
            confirmDisabled={!isMatch}
            onConfirm={
                onConfirm ? () => onConfirm(confirmEmail.trim()) : undefined
            }
            icon={
                <div className="w-[4.8vw] h-[4.8vw] min-w-[56px] min-h-[56px] max-w-[72px] max-h-[72px] rounded-full bg-[#F0D1C9] flex items-center justify-center">
                    <Image
                        src={binIcon}
                        alt=""
                        className="w-[2.4vw] h-[2.4vw] min-w-[28px] min-h-[28px] max-w-[36px] max-h-[36px] object-contain"
                    />
                </div>
            }
            description={
                <>
                    <p className="text-xs text-[#C6473A] text-center mt-[0.8vh] leading-snug">
                        <strong className="!font-[700]">WARNING</strong> this is
                        permanent and
                        <br />
                        cannot be undone!
                    </p>
                    <p className="text-xs text-[#171717] mt-[2.2vh] leading-relaxed">
                        All of your personal data, preferences, and history will
                        be immediately and permanently deleted.
                    </p>
                </>
            }
        >
            <div className="mt-[2.2vh]">
                <label
                    htmlFor={emailId}
                    className="block text-xs font-medium text-[#171717] mb-[0.8vh]"
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
                    placeholder={`Type "${expectedEmail}" to confirm`}
                    className="w-full h-[3.8vh] min-h-[34px] px-3 rounded-[12px] border border-[#171717] bg-transparent text-xs text-[#171717] placeholder:text-[#999999] focus:outline-none focus:ring-1 focus:ring-[#171717] disabled:opacity-60"
                />
            </div>
        </DeleteConfirmationModal>
    );
}
