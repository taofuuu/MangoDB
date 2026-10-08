'use client';

import { SimpleTextInput } from '@/components/sm-detail/SimpleTextInput';
import type { Dispatch, SetStateAction } from 'react';
import CompanyTypeField from '../forms/CompanyTypeField';

export type CompanyInfo = {
    companyName: string;
    companyDescription: string;
    companyType: string[];
    phoneNumber: string;
    email: string;
    address: string;
    website: string;
};

export type CompanyInfoError = {
    companyNameError?: string;
    companyDescriptionError?: string;
    companyTypeError?: string;
    phoneNumberError?: string;
    emailError?: string;
    addressError?: string;
    websiteError?: string;
};

type CompanyInfoStepProps = {
    value: CompanyInfo;
    // The page's own state setter — see AccountStep for why it is updated
    // directly rather than through a copy here.
    onChange: Dispatch<SetStateAction<CompanyInfo>>;
    errors?: CompanyInfoError;
    onClearError?: (field: keyof CompanyInfo) => void;
};

export default function CompanyInfoStep({
    value,
    onChange,
    errors,
    onClearError,
}: CompanyInfoStepProps) {
    // Functional updates: several fields can report in the same moment (fast
    // typing, autofill), and copying `value` from this render would let
    // each one overwrite the others with stale values.
    const handleUpdateCompanyType = (companyType: string[]) => {
        onChange((prev) => ({ ...prev, companyType: companyType }));
        if (companyType.length > 0) {
            onClearError?.('companyType');
        }
    };

    const handleUpdateCompanyName = (companyName: string) => {
        onChange((prev) => ({ ...prev, companyName: companyName }));
        if (companyName.trim()) {
            onClearError?.('companyName');
        }
    };

    const handleUpdateCompanyDescription = (companyDescription: string) => {
        onChange((prev) => ({
            ...prev,
            companyDescription: companyDescription,
        }));
        onClearError?.('companyDescription');
    };

    const handleUpdatePhoneNumber = (phoneNumber: string) => {
        onChange((prev) => ({ ...prev, phoneNumber: phoneNumber }));
        if (phoneNumber.trim()) {
            onClearError?.('phoneNumber');
        }
    };

    const handleUpdateEmail = (email: string) => {
        onChange((prev) => ({ ...prev, email: email }));
        if (email.trim()) {
            onClearError?.('email');
        }
    };

    const handleUpdateAddress = (address: string) => {
        onChange((prev) => ({ ...prev, address: address }));
        onClearError?.('address');
    };

    const handleUpdateWebsite = (website: string) => {
        onChange((prev) => ({ ...prev, website: website }));
        onClearError?.('website');
    };

    return (
        <div className="company-info-page flex flex-col gap-5 my-5">
            <SimpleTextInput
                title="Company Name"
                onChange={handleUpdateCompanyName}
                initValue={value ? value.companyName : ''}
                error={errors?.companyNameError || ''}
                required
                maxLength={255}
            />
            <SimpleTextInput
                title="Company Description"
                onChange={handleUpdateCompanyDescription}
                initValue={value ? value.companyDescription : ''}
                error={errors?.companyDescriptionError || ''}
                maxLength={2000}
            />

            <CompanyTypeField
                label="Company Type"
                value={value ? value.companyType : []}
                onChange={handleUpdateCompanyType}
                error={errors?.companyTypeError || ''}
            />

            <div className="flex gap-4">
                <SimpleTextInput
                    title="Phone Number"
                    onChange={handleUpdatePhoneNumber}
                    initValue={value ? value.phoneNumber : ''}
                    error={errors?.phoneNumberError || ''}
                    required
                    type="tel"
                    maxLength={20}
                />
                <SimpleTextInput
                    title="Email"
                    onChange={handleUpdateEmail}
                    initValue={value ? value.email : ''}
                    error={errors?.emailError || ''}
                    required
                    type="email"
                    maxLength={100}
                />
            </div>
            <SimpleTextInput
                title="Address"
                onChange={handleUpdateAddress}
                initValue={value ? value.address : ''}
                error={errors?.addressError || ''}
                maxLength={500}
            />
            <SimpleTextInput
                title="Website"
                onChange={handleUpdateWebsite}
                initValue={value ? value.website : ''}
                error={errors?.websiteError || ''}
                maxLength={255}
            />
        </div>
    );
}
