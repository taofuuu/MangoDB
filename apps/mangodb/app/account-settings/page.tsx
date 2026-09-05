'use client';

import { useState } from 'react';
import DeleteAccountModal from '@/components/ui/DeleteAccountModal';

export default function AccountPage() {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const mockUsername = 'johndoe';
    const mockEmail = 'johndoe@example.com';

    const handleDeleteAccount = (confirmedEmail: string) => {
        setIsDeleting(true);
        console.log('Account deleted for email:', confirmedEmail);
        setTimeout(() => {
            setIsDeleting(false);
            setIsDeleteOpen(false);
            alert(`Account with email "${confirmedEmail}" has been deleted.`);
        }, 800);
    };

    return (
        <main className="min-h-screen p-10 bg-[#FAF9F6]">
            <div className="max-w-xl mx-auto space-y-6">
                <header className="border-b border-gray-200 pb-4">
                    <h1 className="text-lg font-bold text-[#171717]">
                        Account Settings
                    </h1>
                    <p className="text-xs text-[#666666] mt-1">
                        Manage your profile, credentials, and account settings.
                    </p>
                </header>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-md font-semibold text-[#171717]">
                        Profile Information
                    </h2>
                    <div className="mt-3 text-xs text-[#555555]">
                        <p>
                            <strong>Username:</strong> {mockUsername}
                        </p>
                        <p className="mt-1">
                            <strong>Email:</strong> {mockEmail}
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50/40 p-6 shadow-sm">
                    <h2 className="text-md font-semibold text-[#C6473A]">
                        Danger Zone
                    </h2>
                    <p className="mt-1 text-xs text-[#666666]">
                        Once you delete your account, there is no going back.
                        Please be certain.
                    </p>

                    <button
                        type="button"
                        onClick={() => setIsDeleteOpen(true)}
                        className="mt-4 rounded-lg bg-[#CE473E] px-4 py-2 text-xs font-semibold text-[#FFFDF9] transition-colors hover:bg-[#B93D35]"
                    >
                        Delete Account
                    </button>
                </div>
            </div>

            <DeleteAccountModal
                isOpen={isDeleteOpen}
                isDeleting={isDeleting}
                expectedEmail={mockEmail}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDeleteAccount}
            />
        </main>
    );
}
