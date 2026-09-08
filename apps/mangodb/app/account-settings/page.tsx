'use client';

import { useState } from 'react';
import Image from 'next/image';
import penIcon from '@/assets/icons/pen.png';
import DeleteAccountModal from '@/components/ui/DeleteAccountModal';
import EditProfileForm, {
    type ProfileData,
} from '@/components/forms/EditProfileForm';

export default function AccountPage() {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [username, setUsername] = useState('johndoe');
    const [email, setEmail] = useState('johndoe@example.com');
    const [password, setPassword] = useState('password123');

    const handleSaveProfile = (data: ProfileData) => {
        setUsername(data.username);
        setEmail(data.email);
        if (data.password) {
            setPassword(data.password);
        }
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
                    <div className="flex items-center justify-between">
                        <h2 className="text-md font-semibold text-[#171717]">
                            Account Information
                        </h2>
                        <button
                            type="button"
                            onClick={() => setIsEditOpen(true)}
                            aria-label="Edit Account Information"
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <Image
                                src={penIcon}
                                alt="Edit account information"
                                width={18}
                                height={18}
                                className="w-[18px] h-[18px] object-contain cursor-pointer"
                            />
                        </button>
                    </div>
                    <div className="mt-3 text-xs text-[#555555]">
                        <p>
                            <strong>Username:</strong> {username}
                        </p>
                        <p className="mt-1">
                            <strong>Email:</strong> {email}
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

            {isEditOpen && (
                <EditProfileForm
                    isOpen={isEditOpen}
                    initialData={{ username, email, password }}
                    onClose={() => setIsEditOpen(false)}
                    onSave={handleSaveProfile}
                />
            )}

            {/* Frontend confirmation closes the popup through onClose. */}
            <DeleteAccountModal
                isOpen={isDeleteOpen}
                expectedEmail={email}
                onClose={() => setIsDeleteOpen(false)}
            />
        </main>
    );
}
