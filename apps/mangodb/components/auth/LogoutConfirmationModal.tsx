'use client';

import Image from 'next/image';
import logoutIcon from '@/assets/icons/logout.png';
import ConfirmModal, { type ConfirmModalBaseProps } from '../ui/ConfirmModal';

export default function LogoutConfirmationModal(props: ConfirmModalBaseProps) {
    return (
        <ConfirmModal
            {...props}
            title="Confirm Logout?"
            description="You will not receive notifications anymore."
            confirmLabel="Logout"
            confirmVariant="danger"
            pendingLabel="Logging out…"
            cancelLabel="Cancel"
            icon={
                <Image
                    src={logoutIcon}
                    alt=""
                    className="h-[4.6vh] min-h-[38px] w-[3vw] min-w-[44px] shrink-0 object-contain"
                />
            }
        />
    );
}
