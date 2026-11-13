'use client';

import { useState } from 'react';
import type { UpdateCompanyProfileRequest } from '@mangodb/shared';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import StatusMessage, { type StatusMessageData } from '../ui/StatusMessage';
import CompanyTypeField from './CompanyTypeField';
import ProfilePhotoPanel from './ProfilePhotoPanel';
import ProviderTermsFields from './ProviderTermsFields';
import AdminDeleteAccountModal from './AdminDeleteAccountModal';
import {
    normalizePhone,
    normalizeWebsiteUrl,
    type ProfileFormData,
} from '@/lib/validation/company';
import { isProviderAccount } from '@/lib/roles';

// An empty input means "cleared", and the API spells that null. Sending ''
// would store an empty string in most columns and fail outright on website,
// whose rule is z.url().
function orNull(value: string | null): string | null {
    const trimmed = (value ?? '').trim();
    return trimmed === '' ? null : trimmed;
}

// What the form holds is not quite what the endpoint takes. Four fields are
// absent: accountType is not editable, companyPhoto is written by its own
// route, and username and email belong to Account Settings, which is where a
// company changes what it signs in with. Everything else goes every time,
// which also keeps the body from ever being empty — the API rejects {} as a
// client bug.
//
// It lives with the form rather than in lib/companies.ts so the API layer
// stays free of anything form-shaped.
export function toUpdateRequest(
    data: ProfileFormData,
): UpdateCompanyProfileRequest {
    const isProvider = isProviderAccount(data.accountType);

    return {
        // Not run through orNull: these columns are not nullable, so a cleared
        // one should come back as a field-level 400 rather than be dropped.
        companyName: data.companyName,
        phone: normalizePhone(data.phone),
        companyType: data.companyType,
        companyDescription: orNull(data.companyDescription),
        address: orNull(data.address),
        contactEmail: orNull(data.contactEmail),
        // Normalizes website so formats like www.domain.com prepend https://
        // to satisfy backend z.url() validation while accepting standard domain input.
        website: normalizeWebsiteUrl(data.website),
        // A RECEIVER company owns no provider row, so sending either of these
        // is a deliberate 403. Leave them out rather than send null.
        ...(isProvider && {
            serviceTerm: orNull(data.serviceTerm),
            warrantyPolicy: orNull(data.warrantyPolicy),
        }),
    };
}

type CompanyProfileFormProps = {
    initialData: ProfileFormData;
    // The picked file rides alongside the fields rather than inside them: it
    // is not part of the JSON body and goes up on its own request.
    onSave: (data: ProfileFormData, photo: File | null) => Promise<void> | void;
    onCancel?: (() => void) | undefined;
    // Left out when an administrator is editing another company: there is no
    // endpoint for that, so the panel renders read-only instead.
    canEditPhoto?: boolean | undefined;
    photoError?: string | undefined;
    onPhotoError?: ((message: string | undefined) => void) | undefined;
    onPhotoRemove?: (() => void) | undefined;
    isRemovingPhoto?: boolean | undefined;
    errors?: Partial<Record<keyof ProfileFormData, string>> | undefined;
    // US6-4. Set only when an administrator is editing another company's
    // account: it turns on the Delete account section below the form fields.
    // A company editing its own profile never gets these, so the section stays
    // hidden — self-deletion lives on /account-settings.
    onDeleteAccount?:
        ((adminPassword: string) => void | Promise<void>) | undefined;
    deleteAccountUsername?: string | undefined;
    status?: StatusMessageData | undefined;
    isSaving?: boolean | undefined;
    onClearError?: ((field: keyof ProfileFormData) => void) | undefined;
    onDismissStatus?: (() => void) | undefined;
};

export default function CompanyProfileForm({
    initialData,
    onSave,
    onCancel,
    canEditPhoto = false,
    photoError,
    onPhotoError,
    onPhotoRemove,
    isRemovingPhoto = false,
    errors,
    status,
    onDeleteAccount,
    deleteAccountUsername,
    isSaving = false,
    onClearError,
    onDismissStatus,
}: CompanyProfileFormProps) {
    const [data, setData] = useState<ProfileFormData>(initialData);
    // Picked but not uploaded. Held here so Cancel drops it with everything
    // else, and so a failed save leaves the choice in place to retry.
    const [photo, setPhoto] = useState<File | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Both live on the provider table. A receiver-only company owns no row
    // there, so showing the inputs would offer edits that cannot be saved.
    const isProvider = isProviderAccount(data.accountType);

    // A save replaces initialData with what was stored and Cancel resets to
    // the same thing, so the form always edits the last known good profile.
    // Adjusted during render rather than in an effect: an effect would render
    // the stale values once before correcting them.
    const [lastInitial, setLastInitial] = useState(initialData);
    if (lastInitial !== initialData) {
        setLastInitial(initialData);
        setData(initialData);
        // The save that produced this initialData uploaded it, so what is on
        // screen now comes from initialData.companyPhoto.
        setPhoto(null);
    }

    const setField = <K extends keyof ProfileFormData>(
        key: K,
        value: ProfileFormData[K],
    ) => {
        setData((current) => ({ ...current, [key]: value }));
        if (errors?.[key] && onClearError) {
            onClearError(key);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(data, photo);
    };

    const handleCancel = () => {
        setData(initialData);
        setPhoto(null);
        onPhotoError?.(undefined);
        onCancel?.();
    };

    const displayErrors = errors ?? {};
    const displayStatus = status ?? null;
    const handleDismissStatus = () => {
        onDismissStatus?.();
    };

    return (
        // noValidate so every message reaches the user the same way. The
        // browser's own check on type="email" silently blocks submit and shows
        // its own tooltip, which skips the error slots under each field.
        <form onSubmit={handleSubmit} noValidate>
            <header className="border-b border-brand/50 pb-3">
                <h1 className="type-hd text-ink">Edit Profile</h1>
            </header>

            <div className="mt-8 flex flex-col-reverse md:flex-row md:items-start md:justify-between gap-10">
                {/* Form fields in a single vertical column */}
                <div className="flex-1 max-w-lg space-y-4">
                    <Input
                        label="Company Name"
                        value={data.companyName}
                        onChange={(v) => setField('companyName', v)}
                        error={displayErrors.companyName}
                        maxLength={255}
                        variant="small"
                    />

                    <CompanyTypeField
                        label="Company Type"
                        value={data.companyType}
                        onChange={(v) => setField('companyType', v)}
                        error={displayErrors.companyType}
                    />

                    <Textarea
                        label="Company Description"
                        value={data.companyDescription ?? ''}
                        onChange={(v) => setField('companyDescription', v)}
                        error={displayErrors.companyDescription}
                        maxLength={1000}
                        variant="small"
                    />

                    {isProvider && (
                        <ProviderTermsFields
                            serviceTerm={data.serviceTerm}
                            warrantyPolicy={data.warrantyPolicy}
                            onChange={setField}
                            errors={displayErrors}
                        />
                    )}

                    <Textarea
                        label="Company Location"
                        value={data.address ?? ''}
                        onChange={(v) => setField('address', v)}
                        error={displayErrors.address}
                        maxLength={500}
                        variant="small"
                    />

                    <Input
                        label="Contact Email"
                        type="email"
                        value={data.contactEmail ?? ''}
                        onChange={(v) => setField('contactEmail', v)}
                        error={displayErrors.contactEmail}
                        maxLength={100}
                        variant="small"
                    />

                    <Input
                        label="Phone Number"
                        type="tel"
                        value={data.phone}
                        onChange={(v) => setField('phone', v)}
                        error={displayErrors.phone}
                        maxLength={20}
                        variant="small"
                    />

                    <Input
                        label="Website"
                        value={data.website ?? ''}
                        onChange={(v) => setField('website', v)}
                        error={displayErrors.website}
                        maxLength={255}
                        variant="small"
                    />

                    {/* US6-4. Admin-only: hidden unless the page wires a
                        delete handler for the account being edited. */}
                    {onDeleteAccount && (
                        <div className="pt-4 border-t border-danger/20">
                            <h2 className="border-b border-danger/40 pb-2 type-sm !font-[600] text-danger">
                                Delete account
                            </h2>
                            <p className="mt-1.5 type-xs text-ink-soft">
                                Once you delete this account, there is no going
                                back. Please be certain.
                            </p>
                            <Button
                                variant="danger"
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="mt-3 min-h-[36px] px-4 type-xs !font-[600]"
                            >
                                Delete this account
                            </Button>
                        </div>
                    )}

                    <StatusMessage
                        status={displayStatus}
                        onDismiss={handleDismissStatus}
                    />

                    <div className="pt-4 flex items-center gap-3">
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="min-w-[130px] px-5 py-2 cursor-pointer type-sm !font-[600]"
                        >
                            {isSaving ? 'Saving…' : 'Save Changes'}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="min-w-[130px] px-5 py-2 cursor-pointer type-sm !font-[600]"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>

                {/* Profile photo panel on the right */}
                <div className="w-full md:w-48 shrink-0 flex flex-col items-center">
                    <ProfilePhotoPanel
                        photoUrl={data.companyPhoto}
                        pendingPhoto={photo}
                        {...(canEditPhoto && {
                            onPhotoChange: (file: File | null) => {
                                setPhoto(file);
                                onPhotoError?.(undefined);
                            },
                            onPhotoRemove,
                            onPhotoError,
                        })}
                        error={photoError}
                        isRemoving={isRemovingPhoto}
                        accountType={data.accountType}
                    />
                </div>
            </div>

            {onDeleteAccount && (
                <AdminDeleteAccountModal
                    isOpen={isDeleteModalOpen}
                    username={deleteAccountUsername ?? data.companyName}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={onDeleteAccount}
                />
            )}
        </form>
    );
}
