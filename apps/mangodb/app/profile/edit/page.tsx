'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiRequestError } from '@/lib/api';
import { getMyProfile, updateMyProfile } from '@/lib/companies';
import EditProfileForm, {
    ProfileFormData,
    toUpdateRequest,
} from '@/components/forms/EditProfileForm';

type FormErrors = Partial<Record<keyof ProfileFormData, string>>;
type SaveStatus = { type: 'success' | 'error'; message: string } | null;

// zod reports an array problem as "company_type.0"; the form keys its errors by
// field, so only the part before the first dot is useful here.
function toFormErrors(details: ApiRequestError['details']): FormErrors {
    const errors: FormErrors = {};

    for (const detail of details) {
        const field = detail.field.split('.')[0] as keyof ProfileFormData;
        if (field && !errors[field]) {
            errors[field] = detail.message;
        }
    }

    return errors;
}

export default function EditProfilePage() {
    const router = useRouter();
    const [saved, setSaved] = useState<ProfileFormData | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [errors, setErrors] = useState<FormErrors>({});
    const [status, setStatus] = useState<SaveStatus>(null);

    // No token check first: without one the request 401s anyway, and a token
    // that is expired or revoked lands in the same place. One path for "you are
    // not signed in", whatever the reason.
    useEffect(() => {
        getMyProfile()
            .then((profile) => {
                // photoUrl has no column on the server, so it starts empty and
                // only ever lives in this page's state.
                setSaved({ ...profile, photoUrl: null });
            })
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

    const handleSave = async (data: ProfileFormData) => {
        setErrors({});
        setStatus(null);

        try {
            const profile = await updateMyProfile(toUpdateRequest(data));
            // Keep the photo: the response cannot carry one, so spreading it
            // over the form state would wipe the preview the user just picked.
            setSaved({ ...profile, photoUrl: data.photoUrl });
            setStatus({ type: 'success', message: 'Profile saved.' });
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
        }
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
                    <Link href="/dev/session" className="underline">
                        Get a token
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
                <EditProfileForm
                    initialData={saved}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    errors={errors}
                    status={status}
                />
            )}
        </main>
    );
}
