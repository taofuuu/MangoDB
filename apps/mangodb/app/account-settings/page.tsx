'use client';

import { useState } from 'react';
import Image from 'next/image';
import penIcon from '@/assets/icons/pen.png';
import DeleteAccountModal from '@/components/ui/DeleteAccountModal';
import EditAccountModal, {
    type EditAccountMode,
} from '@/components/forms/EditAccountModal';

export default function AccountPage() {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editMode, setEditMode] = useState<EditAccountMode>('username');

    // Account credentials (placeholder until connected to backend API)
    const [username, setUsername] = useState('johndoe');
    const [email, setEmail] = useState('johndoe@example.com');

    const openEditModal = (mode: EditAccountMode) => {
        setEditMode(mode);
        setIsEditModalOpen(true);
    };

    const handleSaveAccount = ({
        mode,
        newValue,
    }: {
        mode: EditAccountMode;
        newValue: string;
        currentPassword: string;
    }) => {
        // Update local state and ready for backend API dispatch
        if (mode === 'username') setUsername(newValue);
        if (mode === 'email') setEmail(newValue);
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

                {/* Account Information Card with Segmented Rows */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-6 pb-4 border-b border-gray-100">
                        <h2 className="text-md font-semibold text-[#171717]">
                            Account Information
                        </h2>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {/* 1. Username Row */}
                        <div className="flex items-center justify-between p-6 py-4 hover:bg-gray-50/50 transition-colors">
                            <div>
                                <span className="block text-xs text-[#666666]">
                                    Username
                                </span>
                                <span className="block text-sm font-medium text-[#171717] mt-0.5">
                                    {username}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => openEditModal('username')}
                                aria-label="Edit Username"
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                <Image
                                    src={penIcon}
                                    alt="Edit username"
                                    width={18}
                                    height={18}
                                    className="w-[18px] h-[18px] object-contain"
                                />
                            </button>
                        </div>

                        {/* 2. Email Row */}
                        <div className="flex items-center justify-between p-6 py-4 hover:bg-gray-50/50 transition-colors">
                            <div>
                                <span className="block text-xs text-[#666666]">
                                    Email
                                </span>
                                <span className="block text-sm font-medium text-[#171717] mt-0.5">
                                    {email}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => openEditModal('email')}
                                aria-label="Edit Email"
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                <Image
                                    src={penIcon}
                                    alt="Edit email"
                                    width={18}
                                    height={18}
                                    className="w-[18px] h-[18px] object-contain"
                                />
                            </button>
                        </div>

                        {/* 3. Change Password Row */}
                        <div className="flex items-center justify-between p-6 py-4 hover:bg-gray-50/50 transition-colors">
                            <div>
                                <span className="block text-xs text-[#666666]">
                                    Password
                                </span>
                                <span className="block text-sm font-medium text-[#171717] mt-0.5 tracking-wider">
                                    ••••••••
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => openEditModal('password')}
                                aria-label="Change Password"
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                <Image
                                    src={penIcon}
                                    alt="Change password"
                                    width={18}
                                    height={18}
                                    className="w-[18px] h-[18px] object-contain"
                                />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
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
                        className="mt-4 rounded-lg bg-[#CE473E] px-4 py-2 text-xs font-semibold text-[#FFFDF9] transition-colors hover:bg-[#B93D35] cursor-pointer"
                    >
                        Delete Account
                    </button>
                </div>
            </div>

            {/* Individual Field Edit Modal */}
            <EditAccountModal
                isOpen={isEditModalOpen}
                mode={editMode}
                currentValue={
                    editMode === 'username'
                        ? username
                        : editMode === 'email'
                          ? email
                          : ''
                }
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveAccount}
            />

            {/* Delete Account Modal */}
            <DeleteAccountModal
                isOpen={isDeleteOpen}
                expectedEmail={email}
                onClose={() => setIsDeleteOpen(false)}
            />
        </main>
    );
}
