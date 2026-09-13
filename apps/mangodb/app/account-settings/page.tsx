'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ChangeCredentialsRequest, CompanyProfile } from '@mangodb/shared';
import penIcon from '@/assets/icons/pen.png';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';
import {
    changeMyCredentials,
    deleteMyAccount,
    getMyProfile,
} from '@/lib/companies';
import { redirectToLogin } from '@/lib/session';
import LogoutButton from '@/components/auth/LogoutButton';
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
export default function AccountPage() {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editMode, setEditMode] = useState<EditAccountMode>('username');

    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [deletionSuccess, setDeletionSuccess] = useState(false);

    useEffect(() => {
        if (!deletionSuccess) return;
        const timer = setTimeout(() => {
            redirectToLogin();
        }, 5000);
        return () => clearTimeout(timer);
    }, [deletionSuccess]);

    // No token check first: without one the request 401s anyway, and a token
    // that is expired or revoked lands in the same place. One path for "you are
    // not signed in", whatever the reason.
    useEffect(() => {
        getMyProfile()
            .then(setProfile)
            .catch((err: unknown) => {
                if (isNotSignedIn(err)) {
                    setLoadError(NOT_SIGNED_IN);
                    return;
                }
                setLoadError(describeError(err));
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
                ? { currentPassword: currentPassword, username: newValue }
                : mode === 'email'
                  ? { currentPassword: currentPassword, email: newValue }
                  : {
                        currentPassword: currentPassword,
                        newPassword: newValue,
                    };

        try {
            // The response is the saved profile, so the card refreshes from it
            // rather than re-fetching.
            setProfile(await changeMyCredentials(body));
        } catch (err) {
            // Rethrown, not swallowed: the modal only closes on a resolved
            // promise, so this is what keeps it open with the message beside
            // the fields the user still has typed in.
            throw new Error(describeError(err));
        }

        setStatus(`${LABELS[mode]} updated.`);
    };

    const handleDeleteAccount = async () => {
        try {
            await deleteMyAccount();
        } catch (err) {
            // Rethrown so DeleteConfirmationModal catches and displays the error (e.g. 409 ongoing project)
            throw new Error(describeError(err));
        }

        setIsDeleteOpen(false);
        setDeletionSuccess(true);
    };

    return (
        <main className="min-h-screen p-10 bg-surface-warm">
            <div className="max-w-xl mx-auto space-y-6">
                <header className="border-b border-gray-200 pb-4">
                    <h1 className="type-lg font-bold text-ink">
                        Account Settings
                    </h1>
                    <p className="type-xs text-ink-soft mt-1">
                        Manage your profile, credentials, and account settings.
                    </p>
                </header>

                {loadError === NOT_SIGNED_IN && (
                    <p className="type-xs text-ink-soft">
                        You are not signed in.{' '}
                        <Link href="/login" className="underline">
                            Log in
                        </Link>
                        , then come back.
                    </p>
                )}

                {loadError && loadError !== NOT_SIGNED_IN && (
                    <p role="alert" className="type-xs text-danger">
                        {loadError}
                    </p>
                )}

                {!loadError && !profile && (
                    <p className="type-xs text-ink-soft">Loading…</p>
                )}

                {profile && (
                    <>
                        {status && (
                            <p
                                role="status"
                                className="type-xs font-medium text-brand"
                            >
                                {status}
                            </p>
                        )}

                        {/* Account Information Card with Segmented Rows */}
                        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                            <div className="p-6 pb-4 border-b border-gray-100">
                                <h2 className="type-md font-semibold text-ink">
                                    Account Information
                                </h2>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {/* 1. Username Row */}
                                <div className="flex items-center justify-between p-6 py-4 hover:bg-gray-50/50 transition-colors">
                                    <div>
                                        <span className="block type-xs text-ink-soft">
                                            Username
                                        </span>
                                        <span className="block type-sm font-medium text-ink mt-0.5">
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
                                        <span className="block type-xs text-ink-soft">
                                            Email
                                        </span>
                                        <span className="block type-sm font-medium text-ink mt-0.5">
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
                                        <span className="block type-xs text-ink-soft">
                                            Password
                                        </span>
                                        <span className="block type-sm font-medium text-ink mt-0.5 tracking-wider">
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

                        {/* Session */}
                        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div>
                                <h2 className="type-md font-semibold text-ink">
                                    Logout
                                </h2>
                                <p className="mt-1 type-xs text-ink-soft">
                                    Logging out revokes the token this session
                                    is using. You will need to log in again.
                                </p>
                            </div>

                            <LogoutButton />
                        </div>

                        {/* Danger Zone */}
                        <div className="rounded-xl border border-red-200 bg-red-50/40 p-6 shadow-sm">
                            <h2 className="type-md font-semibold text-danger-4">
                                Danger Zone
                            </h2>
                            <p className="mt-1 type-xs text-ink-soft">
                                Once you delete your account, there is no going
                                back. Please be certain.
                            </p>

                            <button
                                type="button"
                                onClick={() => setIsDeleteOpen(true)}
                                className="mt-4 rounded-lg bg-danger-3 px-4 py-2 type-xs font-semibold text-surface transition-colors hover:bg-danger-hover cursor-pointer"
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
                onConfirm={handleDeleteAccount}
            />

            {/* Deletion Result Modal */}
            {deletionSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-[2.6vh]">
                    <section
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="deletion-result-title"
                        aria-describedby="deletion-result-desc"
                        className="rounded-[20px] max-h-[92vh] w-full max-w-[24vw] min-w-[280px] bg-surface text-ink px-[1.8vw] py-[2.6vh] shadow-xl text-center max-md:max-w-[75vw] max-sm:max-w-[90vw] max-md:px-[4vw]"
                    >
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-tint text-danger-2">
                            <svg
                                className="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <h2
                            id="deletion-result-title"
                            className="type-md font-semibold text-ink mt-3"
                        >
                            Account Deleted
                        </h2>
                        <p
                            id="deletion-result-desc"
                            className="type-xs text-ink-soft mt-2 leading-relaxed"
                        >
                            Your account has been successfully deleted. Please
                            note that records of your past projects and reviews
                            have been retained. You will now be redirected to
                            the login page.
                        </p>
                        <button
                            type="button"
                            onClick={redirectToLogin}
                            className="mt-5 w-full rounded-[14px] h-[3.8vh] min-h-[34px] px-3 bg-danger-2 type-xs text-surface font-semibold transition-colors hover:bg-danger-hover cursor-pointer"
                        >
                            Go to Login
                        </button>
                    </section>
                </div>
            )}
        </main>
    );
}
