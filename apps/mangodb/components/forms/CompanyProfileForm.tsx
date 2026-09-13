'use client';

import { useState } from 'react';
import type {
    CompanyProfile,
    UpdateCompanyProfileRequest,
} from '@mangodb/shared';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import StatusMessage, { type StatusMessageData } from '../ui/StatusMessage';
import CompanyTypeField from './CompanyTypeField';
import ProfilePhotoPanel from '../profile/ProfilePhotoPanel';
import AdminDeleteAccountModal from '../ui/AdminDeleteAccountModal';
import { normalizePhone, normalizeWebsiteUrl } from '@/lib/validation';

export type ProfileFormData = Pick<
    CompanyProfile,
    | 'company_name'
    | 'company_description'
    | 'contact_email'
    | 'phone'
    | 'website'
    | 'address'
    | 'company_type'
    | 'account_type'
    // Provider-only columns. A RECEIVER company reads null for both, which is
    // why the two fields below are not rendered for one.
    | 'service_term'
    | 'warranty_policy'
> & {
    // The one field with nowhere to go: no upload endpoint, and no column to
    // store the result, so it is lost on reload.
    photoUrl: string | null;
};

// An empty input means "cleared", and the API spells that null. Sending ''
// would store an empty string in most columns and fail outright on website,
// whose rule is z.url().
function orNull(value: string | null): string | null {
    const trimmed = (value ?? '').trim();
    return trimmed === '' ? null : trimmed;
}

// What the form holds is not quite what the endpoint takes. Four fields are
// absent: account_type is not editable, photoUrl has no column to live in, and
// username and email belong to Account Settings, which is where a company
// changes what it signs in with. Everything else goes every time, which also
// keeps the body from ever being empty — the API rejects {} as a client bug.
//
// It lives beside ProfileFormData rather than in lib/companies.ts so the API
// layer stays free of anything form-shaped.
export function toUpdateRequest(
    data: ProfileFormData,
): UpdateCompanyProfileRequest {
    const isProvider =
        data.account_type === 'PROVIDER' || data.account_type === 'BOTH';

    return {
        // Not run through orNull: these columns are not nullable, so a cleared
        // one should come back as a field-level 400 rather than be dropped.
        company_name: data.company_name,
        phone: normalizePhone(data.phone),
        company_type: data.company_type,
        company_description: orNull(data.company_description),
        address: orNull(data.address),
        contact_email: orNull(data.contact_email),
        // Normalizes website so formats like www.domain.com prepend https://
        // to satisfy backend z.url() validation while accepting standard domain input.
        website: normalizeWebsiteUrl(data.website),
        // A RECEIVER company owns no provider row, so sending either of these
        // is a deliberate 403. Leave them out rather than send null.
        ...(isProvider && {
            service_term: orNull(data.service_term),
            warranty_policy: orNull(data.warranty_policy),
        }),
    };
}

type CompanyProfileFormProps = {
    initialData: ProfileFormData;
    onSave: (data: ProfileFormData) => Promise<void> | void;
    onCancel?: (() => void) | undefined;
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
    errors,
    status,
    onDeleteAccount,
    deleteAccountUsername,
    isSaving = false,
    onClearError,
    onDismissStatus,
}: CompanyProfileFormProps) {
    const [data, setData] = useState<ProfileFormData>(initialData);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Both live on the provider table. A receiver-only company owns no row
    // there, so showing the inputs would offer edits that cannot be saved.
    const isProvider =
        data.account_type === 'PROVIDER' || data.account_type === 'BOTH';

    // A save replaces initialData with what was stored and Cancel resets to
    // the same thing, so the form always edits the last known good profile.
    // Adjusted during render rather than in an effect: an effect would render
    // the stale values once before correcting them.
    const [lastInitial, setLastInitial] = useState(initialData);
    if (lastInitial !== initialData) {
        setLastInitial(initialData);
        setData(initialData);
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
        await onSave(data);
    };

    const handleCancel = () => {
        setData(initialData);
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
            <h1 className="pl-[1.88vw] text-hd leading-none">Edit Profile</h1>

            <div className="mt-[1.85vh] flex">
                <div className="w-[17.99vw] shrink-0">
                    <ProfilePhotoPanel
                        photoUrl={data.photoUrl}
                        onPhotoChange={(url) => setField('photoUrl', url)}
                        accountType={data.account_type}
                    />
                </div>

                {/* Middle column */}
                <div className="ml-[4.73vw] w-[31.13vw] shrink-0">
                    {/* Username is edited on /account-settings now, beside the
                        email and password, so the column starts here. */}
                    <Textarea
                        label="Company Description"
                        value={data.company_description ?? ''}
                        onChange={(v) => setField('company_description', v)}
                        error={displayErrors.company_description}
                        maxLength={1000}
                    />

                    {isProvider && (
                        <div className="mt-[3.09vh]">
                            <Textarea
                                label="Service Terms"
                                value={data.service_term ?? ''}
                                onChange={(v) => setField('service_term', v)}
                                error={displayErrors.service_term}
                                maxLength={2000}
                            />
                        </div>
                    )}

                    <div className="mt-[3.09vh]">
                        <Input
                            label="Contact Email"
                            type="email"
                            value={data.contact_email ?? ''}
                            onChange={(v) => setField('contact_email', v)}
                            error={displayErrors.contact_email}
                            maxLength={100}
                        />
                    </div>

                    {/* The design draws this one taller than every other
                        single-line field; built at the common height. */}
                    <div className="mt-[3.09vh]">
                        <Input
                            label="Website"
                            value={data.website ?? ''}
                            onChange={(v) => setField('website', v)}
                            error={displayErrors.website}
                            maxLength={255}
                        />
                    </div>

                    {/* US6-4. Admin-only: hidden unless the page wires a
                        delete handler for the account being edited. */}
                    {onDeleteAccount && (
                        <div className="mt-[3.09vh]">
                            <h2 className="border-b border-[#C5483B]/40 pb-[0.74vh] text-md !font-[600] text-[#C5483B]">
                                Delete account
                            </h2>
                            <p className="mt-[1.11vh] text-sm !font-[400] text-[#666666]">
                                Once you delete this account, there is no going
                                back. Please be certain.
                            </p>
                            <Button
                                variant="danger"
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="mt-[1.48vh] h-[4.63vh] px-[1.25vw] text-sm"
                            >
                                Delete this account
                            </Button>
                        </div>
                    )}
                </div>

                {/* Right column */}
                <div className="ml-[8.97vw] w-[31.13vw] shrink-0">
                    <Input
                        label="Company Name"
                        value={data.company_name}
                        onChange={(v) => setField('company_name', v)}
                        error={displayErrors.company_name}
                        maxLength={255}
                    />

                    <div className="mt-[3.09vh]">
                        <CompanyTypeField
                            label="Company Type"
                            value={data.company_type}
                            onChange={(v) => setField('company_type', v)}
                            error={displayErrors.company_type}
                        />
                    </div>

                    {isProvider && (
                        <div className="mt-[3.09vh]">
                            <Textarea
                                label="Company Warranty Policy"
                                value={data.warranty_policy ?? ''}
                                onChange={(v) => setField('warranty_policy', v)}
                                error={displayErrors.warranty_policy}
                                maxLength={2000}
                            />
                        </div>
                    )}

                    <div className="mt-[3.09vh]">
                        <Input
                            label="Phone Number"
                            type="tel"
                            value={data.phone}
                            onChange={(v) => setField('phone', v)}
                            error={displayErrors.phone}
                            maxLength={20}
                        />
                    </div>

                    <div className="mt-[3.09vh]">
                        <Textarea
                            label="Company Location"
                            value={data.address ?? ''}
                            onChange={(v) => setField('address', v)}
                            error={displayErrors.address}
                            className="h-[20.86vh]"
                            maxLength={500}
                        />
                    </div>
                </div>
            </div>

            <StatusMessage
                status={displayStatus}
                onDismiss={handleDismissStatus}
            />

            <div className="mt-[8.33vh] flex justify-center gap-[5.23vw] pb-[6vh]">
                <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="h-[7.04vh] w-[13.91vw] cursor-pointer text-md"
                >
                    Cancel
                </Button>

                <Button
                    type="submit"
                    disabled={isSaving}
                    className="h-[7.13vh] w-[13.96vw] cursor-pointer text-md"
                >
                    {isSaving ? 'Saving…' : 'Save Changes'}
                </Button>
            </div>

            {onDeleteAccount && (
                <AdminDeleteAccountModal
                    isOpen={isDeleteModalOpen}
                    username={deleteAccountUsername ?? data.company_name}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={onDeleteAccount}
                />
            )}
        </form>
    );
}
