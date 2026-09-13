'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';
import {
    deleteCompanyAccount,
    deleteMyPhoto,
    getCompanyAccountDetail,
    getMyProfile,
    updateCompanyAccount,
    updateMyPhoto,
    updateMyProfile,
} from '@/lib/companies';
import {
    PROFILE_FIELDS,
    toFormErrors,
    validateProfile,
    type ProfileErrors,
} from '@/lib/validation';
import type { StatusMessageData } from '@/components/ui/StatusMessage';
import CompanyProfileForm, {
    ProfileFormData,
    toUpdateRequest,
} from '@/components/forms/CompanyProfileForm';

function EditProfilePageInner() {
    const router = useRouter();
    // US6-4. When an administrator opens this page for another account, the id
    // rides in as ?companyId=. Absent, the page edits the signed-in company's
    // own profile exactly as before.
    const targetCompanyId = useSearchParams().get('companyId');
    const isAdminEditingOther = targetCompanyId !== null;

    const [saved, setSaved] = useState<ProfileFormData | null>(null);
    const [targetUsername, setTargetUsername] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [errors, setErrors] = useState<ProfileErrors>({});
    // The photo is not a column this form writes, so it is not in ProfileErrors.
    const [photoError, setPhotoError] = useState<string | undefined>(undefined);
    const [status, setStatus] = useState<StatusMessageData>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);

    // No token check first: without one the request 401s anyway, and a token
    // that is expired or revoked lands in the same place. One path for "you are
    // not signed in", whatever the reason.
    useEffect(() => {
        const load = isAdminEditingOther
            ? getCompanyAccountDetail(Number(targetCompanyId))
            : getMyProfile();

        load.then((profile) => {
            setSaved(profile);
            setTargetUsername(profile.username);
        }).catch((err: unknown) => {
            if (isNotSignedIn(err)) {
                setLoadError(NOT_SIGNED_IN);
                return;
            }
            setLoadError(describeError(err));
        });
    }, [isAdminEditingOther, targetCompanyId]);

    const handleClearError = (field: keyof ProfileFormData) => {
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const handleSave = async (data: ProfileFormData, photo: File | null) => {
        setStatus(null);
        setErrors({});
        setPhotoError(undefined);

        // 1. Run frontend validation
        const frontendErrors = validateProfile(data);
        if (Object.keys(frontendErrors).length > 0) {
            setErrors(frontendErrors);
            setStatus({
                type: 'error',
                message: 'Some fields need fixing.',
            });
            return; // Halt submission
        }

        setIsSaving(true);

        try {
            let profile = isAdminEditingOther
                ? await updateCompanyAccount(
                      Number(targetCompanyId),
                      toUpdateRequest(data),
                  )
                : await updateMyProfile(toUpdateRequest(data));

            // Second request, because the photo is multipart and the fields
            // above are JSON. Deliberately after them: if the upload fails the
            // fields are already stored, and the message says only the photo
            // did not go — the reverse would lose the typed edits.
            if (photo) {
                try {
                    profile = { ...profile, ...(await updateMyPhoto(photo)) };
                } catch (uploadError) {
                    setSaved(profile);
                    setPhotoError(describeError(uploadError));
                    setStatus({
                        type: 'error',
                        message: 'Profile saved, but the photo did not upload.',
                    });
                    return;
                }
            }

            // Update saved with the newly persisted profile so subsequent Cancel
            // actions revert to this latest saved baseline.
            setSaved(profile);
            setStatus({
                type: 'success',
                message: 'Profile saved successfully.',
            });
        } catch (err) {
            // VALIDATION_FAILED and CONFLICT both name the fields they rejected,
            // so those go beside the inputs. Anything else has only a message.
            const { fields, message } = toFormErrors(err, PROFILE_FIELDS);
            setErrors(fields);
            setStatus({
                type: 'error',
                message: message ?? 'Some fields need fixing.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Straight away rather than on Save, because there is no "remove this
    // later" state for the form to hold — and the answer is the whole profile,
    // so this becomes the new Cancel baseline like any other save.
    const handleRemovePhoto = async () => {
        setStatus(null);
        setPhotoError(undefined);
        setIsRemovingPhoto(true);

        try {
            setSaved(await deleteMyPhoto());
        } catch (err) {
            setPhotoError(describeError(err));
        } finally {
            setIsRemovingPhoto(false);
        }
    };

    // US6-4. The confirm modal collects the admin's own password and hands it
    // here. Deliberately uncaught: DeleteConfirmationModal's onConfirm already
    // catches and shows a thrown error's .message as the modal's error line,
    // so a wrong password (401) surfaces there instead of navigating away.
    const handleDeleteAccount = async (adminPassword: string) => {
        await deleteCompanyAccount(Number(targetCompanyId), {
            currentPassword: adminPassword,
        });
        router.push('/companies');
    };

    // Cancel leaves the page. Opening /profile/edit directly leaves nothing to
    // go back to, so fall back to the index rather than doing nothing.
    const handleCancel = () => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push('/');
        }
    };

    return (
        // pt matches the gap the design leaves under the 108px navbar, which
        // is a separate task, so spacing stays right once that lands.
        <main className="min-h-screen bg-surface px-[2.19vw] pt-[6.25vh] text-ink">
            {loadError === NOT_SIGNED_IN && (
                <p className="type-md !font-[400]">
                    You are not signed in.{' '}
                    <Link href="/login" className="underline">
                        Log in
                    </Link>
                    , then come back.
                </p>
            )}

            {loadError && loadError !== NOT_SIGNED_IN && (
                <p className="type-md !font-[400] text-danger">{loadError}</p>
            )}

            {!loadError && !saved && (
                <p className="type-md !font-[400]">Loading…</p>
            )}

            {saved && (
                <CompanyProfileForm
                    initialData={saved}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    // Only for a company editing itself: PATCH /companies/me/photo
                    // acts on the caller, so there is nothing behind an
                    // administrator changing someone else's.
                    canEditPhoto={!isAdminEditingOther}
                    photoError={photoError}
                    onPhotoError={setPhotoError}
                    onPhotoRemove={handleRemovePhoto}
                    isRemovingPhoto={isRemovingPhoto}
                    errors={errors}
                    status={status}
                    onDeleteAccount={
                        isAdminEditingOther ? handleDeleteAccount : undefined
                    }
                    deleteAccountUsername={targetUsername ?? undefined}
                    isSaving={isSaving}
                    onClearError={handleClearError}
                    onDismissStatus={() => setStatus(null)}
                />
            )}
        </main>
    );
}

export default function EditProfilePage() {
    // useSearchParams needs a Suspense boundary above it to render.
    return (
        <Suspense
            fallback={
                <main className="min-h-screen bg-surface px-[2.19vw] pt-[6.25vh] text-ink">
                    <p className="type-md !font-[400]">Loading…</p>
                </main>
            }
        >
            <EditProfilePageInner />
        </Suspense>
    );
}
