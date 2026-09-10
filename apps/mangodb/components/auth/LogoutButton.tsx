'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { logout } from '@/lib/session';

// Signing out is two things that both have to happen: the server revokes the
// token, then the browser forgets it. logout() owns that order, so this only
// decides where the user lands and what a failure says.
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
            // The token is still live on the server, so staying put is the
            // honest outcome: the session did not end.
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
