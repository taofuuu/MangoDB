'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiRequestError } from '@/lib/api';
import {
    getCompanyAccountDetail,
    getMyProfile,
    updateMyProfile,
} from '@/lib/companies';
import type { ProfileErrors } from '@/lib/validation';
import type { StatusMessageData } from '@/components/ui/StatusMessage';
import CompanyProfileForm, {
    ProfileFormData,
    toUpdateRequest,
} from '@/components/forms/CompanyProfileForm';

// zod reports an array problem as "company_type.0"; the form keys its errors by
// field, so only the part before the first dot is useful here.
function toFormErrors(details: ApiRequestError['details']): ProfileErrors {
    const errors: ProfileErrors = {};

    for (const detail of details) {
        const field = detail.field.split('.')[0] as keyof ProfileFormData;
        if (field && !errors[field]) {
            errors[field] = detail.message;
        }
    }

    return errors;
}

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
    const [status, setStatus] = useState<StatusMessageData>(null);
    const [isSaving, setIsSaving] = useState(false);

    // No token check first: without one the request 401s anyway, and a token
    // that is expired or revoked lands in the same place. One path for "you are
    // not signed in", whatever the reason.
    useEffect(() => {
        const load = isAdminEditingOther
            ? getCompanyAccountDetail(Number(targetCompanyId))
            : getMyProfile();

        load.then((profile) => {
            // photoUrl has no column on the server, so it starts empty and
            // only ever lives in this page's state.
            setSaved({ ...profile, photoUrl: null });
            setTargetUsername(profile.username);
        }).catch((err: unknown) => {
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

    const handleSave = async (data: ProfileFormData) => {
        setStatus(null);
        setErrors({});
        setIsSaving(true);

        try {
            const profile = await updateMyProfile(toUpdateRequest(data));
            // Update saved with the newly persisted profile so subsequent Cancel
            // actions revert to this latest saved baseline. Keep the photoUrl as
            // the response does not carry one.
            setSaved({ ...profile, photoUrl: data.photoUrl });
            setStatus({
                type: 'success',
                message: 'Profile saved successfully.',
            });
        } catch (err) {
            if (!(err instanceof ApiRequestError)) {
                setStatus({
                    type: 'error',
                    message:
                        'Could not reach the API. Is it running on port 4000?',
                });
                return;
            }

            // VALIDATION_FAILED and CONFLICT both name the fields they rejected,
            // so those go beside the inputs. Anything else has only a message.
            const fieldErrors = toFormErrors(err.details);
            setErrors(fieldErrors);
            setStatus({
                type: 'error',
                message:
                    Object.keys(fieldErrors).length > 0
                        ? 'Some fields need fixing.'
                        : err.message,
            });
        } finally {
            setIsSaving(false);
        }
    };

    // US6-4. The confirm popup passes the admin's password to this handler, but
    // the DELETE request is a separate backend task, so the argument is dropped
    // for now rather than named and left unused.
    const handleDeleteAccount = async () => {
        // TODO(US6-4 backend): take the admin password and call
        // DELETE /api/admin/companies/:companyId, then throw on failure so the
        // modal keeps its error line. On success the redirect below stands.
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
        <main className="min-h-screen bg-[#FFFDF9] px-[2.19vw] pt-[6.25vh] text-[#171717]">
            {loadError === 'no-token' && (
                <p className="text-md !font-[400]">
                    You are not signed in.{' '}
                    <Link href="/login" className="underline">
                        Log in
                    </Link>
                    , then come back.
                </p>
            )}

            {loadError && loadError !== 'no-token' && (
                <p className="text-md !font-[400] text-[#C5483B]">
                    {loadError}
                </p>
            )}

            {!loadError && !saved && (
                <p className="text-md !font-[400]">Loading…</p>
            )}

            {saved && (
                <CompanyProfileForm
                    initialData={saved}
                    onSave={handleSave}
                    onCancel={handleCancel}
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
                <main className="min-h-screen bg-[#FFFDF9] px-[2.19vw] pt-[6.25vh] text-[#171717]">
                    <p className="text-md !font-[400]">Loading…</p>
                </main>
            }
        >
            <EditProfilePageInner />
        </Suspense>
    );
}
