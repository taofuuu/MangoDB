'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ChangeCredentialsRequest, CompanyProfile } from '@mangodb/shared';
import penIcon from '@/assets/icons/pen.png';
import { ApiRequestError } from '@/lib/api';
import { changeMyCredentials, getMyProfile } from '@/lib/companies';
import DeleteAccountModal from '@/components/ui/DeleteAccountModal';
import EditAccountModal, {
    type EditAccountMode,
} from '@/components/forms/EditAccountModal';

const LABELS: Record<EditAccountMode, string> = {
    username: 'Username',
    email: 'Email',
    password: 'Password',
};

// The modal shows one line and reads nothing but Error.message.
// VALIDATION_FAILED and CONFLICT put the useful text in details[]; '(body)' is
// what parseBody calls a whole-object rule, so prefer a real field when both
// are there. Everything else has only a message — including 401, which covers
// both a wrong current password and an ended session, and only its wording
// tells those apart.
function toModalMessage(err: unknown): string {
    if (!(err instanceof ApiRequestError)) {
        return 'Could not reach the API. Is it running on port 4000?';
    }

    const detail =
        err.details.find((entry) => entry.field !== '(body)') ?? err.details[0];
    return detail ? detail.message : err.message;
}

export default function AccountPage() {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editMode, setEditMode] = useState<EditAccountMode>('username');

    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);

    // No token check first: without one the request 401s anyway, and a token
    // that is expired or revoked lands in the same place. One path for "you are
    // not signed in", whatever the reason.
    useEffect(() => {
        getMyProfile()
            .then(setProfile)
            .catch((err: unknown) => {
                if (err instanceof ApiRequestError && err.status === 401) {
                    setLoadError('no-token');
                    return;
                }
                setLoadError(
                    err instanceof ApiRequestError
                        ? err.message
                        : 'Could not reach the API. Is it running on port 4000?',
                );
            });
    }, []);

    const openEditModal = (mode: EditAccountMode) => {
        setStatus(null);
        setEditMode(mode);
        setIsEditModalOpen(true);
    };

    const handleSaveAccount = async ({
        mode,
        newValue,
        currentPassword,
    }: {
        mode: EditAccountMode;
        newValue: string;
        currentPassword: string;
    }) => {
        const body: ChangeCredentialsRequest =
            mode === 'username'
                ? { current_password: currentPassword, username: newValue }
                : mode === 'email'
                  ? { current_password: currentPassword, email: newValue }
                  : {
                        current_password: currentPassword,
                        new_password: newValue,
                    };

        try {
            // The response is the saved profile, so the card refreshes from it
            // rather than re-fetching.
            setProfile(await changeMyCredentials(body));
        } catch (err) {
            // Rethrown, not swallowed: the modal only closes on a resolved
            // promise, so this is what keeps it open with the message beside
            // the fields the user still has typed in.
            throw new Error(toModalMessage(err));
        }

        setStatus(`${LABELS[mode]} updated.`);
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

                {loadError === 'no-token' && (
                    <p className="text-xs text-[#666666]">
                        You are not signed in.{' '}
                        <Link href="/dev/session" className="underline">
                            Get a token
                        </Link>
                        , then come back.
                    </p>
                )}

                {loadError && loadError !== 'no-token' && (
                    <p role="alert" className="text-xs text-[#C5483B]">
                        {loadError}
                    </p>
                )}

                {!loadError && !profile && (
                    <p className="text-xs text-[#666666]">Loading…</p>
                )}

                {profile && (
                    <>
                        {status && (
                            <p
                                role="status"
                                className="text-xs font-medium text-[#497B93]"
                            >
                                {status}
                            </p>
                        )}

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
                                            {profile.username}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openEditModal('username')
                                        }
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
                                            {profile.email}
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
                                        onClick={() =>
                                            openEditModal('password')
                                        }
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
                                Once you delete your account, there is no going
                                back. Please be certain.
                            </p>

                            <button
                                type="button"
                                onClick={() => setIsDeleteOpen(true)}
                                className="mt-4 rounded-lg bg-[#CE473E] px-4 py-2 text-xs font-semibold text-[#FFFDF9] transition-colors hover:bg-[#B93D35] cursor-pointer"
                            >
                                Delete Account
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Individual Field Edit Modal */}
            <EditAccountModal
                isOpen={isEditModalOpen}
                mode={editMode}
                currentValue={
                    editMode === 'username'
                        ? (profile?.username ?? '')
                        : editMode === 'email'
                          ? (profile?.email ?? '')
                          : ''
                }
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveAccount}
            />

            {/* Delete Account Modal */}
            <DeleteAccountModal
                isOpen={isDeleteOpen}
                expectedEmail={profile?.email ?? ''}
                onClose={() => setIsDeleteOpen(false)}
            />
        </main>
    );
}
