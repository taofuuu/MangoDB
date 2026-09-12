'use client';

import Image from 'next/image';
import logoutIcon from '@/assets/icons/logout.png';
import DeleteConfirmationModal, {
    type DeleteModalProps,
} from './DeleteConfirmationModal';

export default function LogoutConfirmationModal(props: DeleteModalProps) {
    return (
        <DeleteConfirmationModal
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
