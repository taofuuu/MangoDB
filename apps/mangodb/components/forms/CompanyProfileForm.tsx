'use client';

import { useState } from 'react';
import type {
    CompanyProfile,
    UpdateCompanyProfileRequest,
} from '@mangodb/shared';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import CompanyTypeField from './CompanyTypeField';
import ProfilePhotoPanel from '../profile/ProfilePhotoPanel';

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
        phone: data.phone,
        company_type: data.company_type,
        company_description: orNull(data.company_description),
        address: orNull(data.address),
        contact_email: orNull(data.contact_email),
        website: orNull(data.website),
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
    onSave: (data: ProfileFormData) => void;
    onCancel?: () => void;
    // Both slots are filled by sibling tasks: "Validate required profile
    // fields and formats" and "Display profile save success/error messages".
    errors?: Partial<Record<keyof ProfileFormData, string>>;
    status?: { type: 'success' | 'error'; message: string } | null;
};

export default function CompanyProfileForm({
    initialData,
    onSave,
    onCancel,
    errors,
    status,
}: CompanyProfileFormProps) {
    const [data, setData] = useState<ProfileFormData>(initialData);

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
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(data);
    };

    const handleCancel = () => {
        setData(initialData);
        onCancel?.();
    };

    // Both live on the provider table. A receiver-only company owns no row
    // there, so showing the inputs would offer edits that cannot be saved.
    const isProvider =
        data.account_type === 'PROVIDER' || data.account_type === 'BOTH';

    return (
        // noValidate so every message reaches the user the same way. The
        // browser's own check on type="email" silently blocks submit and shows
        // its own tooltip, which skips the error slots under each field.
        <form onSubmit={handleSubmit} noValidate>
            <h1 className="pl-[1.88vw] text-hd !text-[48px] leading-none">
                Edit Profile
            </h1>

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
                        error={errors?.company_description}
                    />

                    {isProvider && (
                        <div className="mt-[3.09vh]">
                            <Textarea
                                label="Service Terms"
                                value={data.service_term ?? ''}
                                onChange={(v) => setField('service_term', v)}
                                error={errors?.service_term}
                            />
                        </div>
                    )}

                    <div className="mt-[3.09vh]">
                        <Input
                            label="Contact Email"
                            type="email"
                            value={data.contact_email ?? ''}
                            onChange={(v) => setField('contact_email', v)}
                            error={errors?.contact_email}
                        />
                    </div>

                    {/* The design draws this one taller than every other
                        single-line field; built at the common height. */}
                    <div className="mt-[3.09vh]">
                        <Input
                            label="Website"
                            value={data.website ?? ''}
                            onChange={(v) => setField('website', v)}
                            error={errors?.website}
                        />
                    </div>
                </div>

                {/* Right column */}
                <div className="ml-[8.97vw] w-[31.13vw] shrink-0">
                    <Input
                        label="Company Name"
                        value={data.company_name}
                        onChange={(v) => setField('company_name', v)}
                        error={errors?.company_name}
                    />

                    <div className="mt-[3.09vh]">
                        <CompanyTypeField
                            label="Company Type"
                            value={data.company_type}
                            onChange={(v) => setField('company_type', v)}
                            error={errors?.company_type}
                        />
                    </div>

                    {isProvider && (
                        <div className="mt-[3.09vh]">
                            <Textarea
                                label="Company Warranty Policy"
                                value={data.warranty_policy ?? ''}
                                onChange={(v) => setField('warranty_policy', v)}
                                error={errors?.warranty_policy}
                            />
                        </div>
                    )}

                    <div className="mt-[3.09vh]">
                        <Input
                            label="Phone Number"
                            type="tel"
                            value={data.phone}
                            onChange={(v) => setField('phone', v)}
                            error={errors?.phone}
                        />
                    </div>

                    <div className="mt-[3.09vh]">
                        <Textarea
                            label="Company Location"
                            value={data.address ?? ''}
                            onChange={(v) => setField('address', v)}
                            error={errors?.address}
                            className="h-[20.86vh]"
                        />
                    </div>
                </div>
            </div>

            {status && (
                <p
                    role="status"
                    className={`mt-[4vh] text-center text-md ${
                        status.type === 'success'
                            ? 'text-[#497B93]'
                            : 'text-[#C5483B]'
                    }`}
                >
                    {status.message}
                </p>
            )}

            <div className="mt-[8.33vh] flex justify-center gap-[5.23vw] pb-[6vh]">
                <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="h-[7.04vh] w-[13.91vw] cursor-pointer text-lg"
                >
                    Cancel
                </Button>

                <Button
                    type="submit"
                    className="h-[7.13vh] w-[13.96vw] cursor-pointer text-lg"
                >
                    Save Changes
                </Button>
            </div>
        </form>
    );
}
