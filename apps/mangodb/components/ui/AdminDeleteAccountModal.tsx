'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import binIcon from '@/assets/icons/bin.png';
import DeleteConfirmationModal, {
    type DeleteModalProps,
} from './DeleteConfirmationModal';

type AdminDeleteAccountModalProps = Omit<DeleteModalProps, 'onConfirm'> & {
    // The account being removed, shown in the title so the admin can see which
    // one they are about to delete before confirming.
    username: string;
    onConfirm?: (adminPassword: string) => void | Promise<void>;
};

export default function AdminDeleteAccountModal({
    isOpen,
    ...props
}: AdminDeleteAccountModalProps) {
    // Closing or switching to another account discards the typed password.
    return isOpen ? (
        <AdminDeleteAccountDialog key={props.username} {...props} />
    ) : null;
}

function AdminDeleteAccountDialog({
    username,
    onConfirm,
    ...props
}: Omit<AdminDeleteAccountModalProps, 'isOpen'>) {
    const passwordId = useId();
    const [password, setPassword] = useState('');
    const canConfirm = password.trim().length > 0;

    return (
        <DeleteConfirmationModal
            {...props}
            isOpen
            title={`Delete account for ${username}?`}
            layout="stacked"
            confirmLabel="Delete Account"
            confirmDisabled={!canConfirm}
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
                    <p className="type-xs text-danger-4 text-center mt-[0.8vh] leading-snug">
                        <strong className="!font-[700]">WARNING</strong> this is
                        permanent and
                        <br />
                        cannot be undone!
                    </p>
                    <p className="type-xs text-ink mt-[2.2vh] leading-relaxed">
                        This account will lose access immediately and cannot be
                        restored. Its listings, proposals, projects, and reviews
                        stay in place, so other companies keep the history that
                        depends on them.
                    </p>
                </>
            }
        >
            <div className="mt-[2.2vh]">
                <label
                    htmlFor={passwordId}
                    className="block type-xs font-medium text-ink mb-[0.8vh]"
                >
                    Enter your admin password to confirm
                </label>
                <input
                    id={passwordId}
                    type="password"
                    autoComplete="off"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') event.preventDefault();
                    }}
                    className="w-full h-[3.8vh] min-h-[34px] px-3 rounded-[12px] border border-ink bg-transparent type-xs text-ink placeholder:text-ink-placeholder-4 focus:outline-none focus:ring-1 focus:ring-ink disabled:opacity-60"
                />
            </div>
        </DeleteConfirmationModal>
    );
}
