'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { logout } from '@/lib/session';

// logout() ends the session on the server — the token is revoked and the
// cookie cleared on the same response — so this only decides where the user
// lands and what a failure says.
export default function LogoutButton() {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogout = async () => {
        setError(null);
        setIsPending(true);

        try {
            await logout();
        } catch {
            // The token may still be live on the server, so staying put is
            // the honest outcome: nothing here confirms the session ended. If
            // the revoke did land and only the response was lost, a retry
            // 401s, and logout() treats that as done.
            setError('Could not sign you out. Try again.');
            setIsPending(false);
            return;
        }

        // No setIsPending(false) on success — the button leaves with the page,
        // and staying disabled stops a second click during the navigation.
        // refresh() drops the router cache so nothing signed-in is replayed
        // from it after the token is gone.
        router.replace('/login');
        router.refresh();
    };

    return (
        <div className="flex flex-col items-end gap-1">
            <Button
                variant="outline"
                onClick={handleLogout}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold"
            >
                {isPending ? 'Logging out…' : 'Log Out'}
            </Button>

            {error && (
                <p role="alert" className="text-xs text-[#C5483B]">
                    {error}
                </p>
            )}
        </div>
    );
}
