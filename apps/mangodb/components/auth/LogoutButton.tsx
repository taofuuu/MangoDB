'use client';

import { useState } from 'react';
import Image from 'next/image';
import logoutIcon from '@/assets/icons/logout.png';
import LogoutConfirmationModal from '@/components/ui/LogoutConfirmationModal';
import { logout, redirectToLogin } from '@/lib/session';

// logout() ends the session on the server — the token is revoked and the
// cookie cleared on the same response — so this only decides where the user
// lands. The confirmation modal owns the pending/error state around that.
export default function LogoutButton() {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const handleConfirm = async () => {
        try {
            await logout();
        } catch {
            // The token may still be live on the server, so staying put is
            // the honest outcome: nothing here confirms the session ended. If
            // the revoke did land and only the response was lost, a retry
            // 401s, and logout() treats that as done. The modal shows this
            // message beside its buttons and leaves itself open.
            throw new Error('Could not sign you out. Try again.');
        }

        // The modal closes itself right after this resolves, but the button
        // is leaving with the page anyway.
        redirectToLogin();
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                aria-label="Log Out"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
                <Image
                    src={logoutIcon}
                    alt=""
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] object-contain"
                />
            </button>

            <LogoutConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirm}
            />
        </>
    );
}
