'use client';

import { useState } from 'react';
import type { CompanyProfile } from '@mangodb/shared';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import CompanyTypeField from './CompanyTypeField';
import DeleteAccountSection from '../profile/DeleteAccountSection';
import ProfilePhotoPanel from '../profile/ProfilePhotoPanel';

export type ProfileFormData = Pick<
    CompanyProfile,
    | 'username'
    | 'company_name'
    | 'company_description'
    | 'email'
    | 'phone'
    | 'website'
    | 'address'
    | 'company_type'
    | 'account_type'
> & {
    // TODO(US1-5): provider-only columns. Neither is in companyProfileSelect
    // or updateCompanyProfileSchema, so they never reach PATCH /companies/me.
    // Sending them means a nested provider write in updateMyProfile first.
    service_term: string | null;
    warranty_policy: string | null;
    // TODO(US1-5): no upload endpoint, and no column to store the result.
    photoUrl: string | null;
};

type EditProfileFormProps = {
    initialData: ProfileFormData;
    onSave: (data: ProfileFormData) => void;
    onCancel?: () => void;
    // Both slots are filled by sibling tasks: "Validate required profile
    // fields and formats" and "Display profile save success/error messages".
    errors?: Partial<Record<keyof ProfileFormData, string>>;
    status?: { type: 'success' | 'error'; message: string } | null;
};

export default function EditProfileForm({
    initialData,
    onSave,
    onCancel,
    errors,
    status,
}: EditProfileFormProps) {
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

    return (
        <form onSubmit={handleSubmit}>
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
                    <Input
                        label="Username"
                        value={data.username}
                        onChange={(v) => setField('username', v)}
                        error={errors?.username}
                    />

                    <div className="mt-[3.09vh]">
                        <Textarea
                            label="Company Description"
                            value={data.company_description ?? ''}
                            onChange={(v) => setField('company_description', v)}
                            error={errors?.company_description}
                        />
                    </div>

                    <div className="mt-[3.09vh]">
                        <Textarea
                            label="Service Terms"
                            value={data.service_term ?? ''}
                            onChange={(v) => setField('service_term', v)}
                            error={errors?.service_term}
                        />
                    </div>

                    <div className="mt-[3.09vh]">
                        <Input
                            label="Email Address"
                            type="email"
                            value={data.email}
                            onChange={(v) => setField('email', v)}
                            error={errors?.email}
                        />
                    </div>

                    {/* The design draws this one taller than every other
                        single-line field; built at the common height. */}
                    <div className="mt-[3.09vh]">
                        <Input
                            label="Website:"
                            value={data.website ?? ''}
                            onChange={(v) => setField('website', v)}
                            error={errors?.website}
                        />
                    </div>

                    <DeleteAccountSection />
                </div>

                {/* Right column */}
                <div className="ml-[8.97vw] w-[31.13vw] shrink-0">
                    <Input
                        label="Company Name:"
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

                    <div className="mt-[3.09vh]">
                        <Textarea
                            label="Company Warranty Policy"
                            value={data.warranty_policy ?? ''}
                            onChange={(v) => setField('warranty_policy', v)}
                            error={errors?.warranty_policy}
                        />
                    </div>

                    <div className="mt-[3.09vh]">
                        <Input
                            label="Phone Number:"
                            type="tel"
                            value={data.phone}
                            onChange={(v) => setField('phone', v)}
                            error={errors?.phone}
                        />
                    </div>

                    <div className="mt-[3.09vh]">
                        <Textarea
                            label="Company Location:"
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
