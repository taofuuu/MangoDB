'use client';

import Input from '@/components/ui/Input';
import type { Dispatch, SetStateAction } from 'react';
import CompanyTypeField from '../profile/CompanyTypeField';

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
    // The page's own state setter — see AccountInfoStep for why it is updated
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
            <Input
                label="Company Name*"
                value={value.companyName ?? ''}
                onChange={handleUpdateCompanyName}
                error={errors?.companyNameError}
                maxLength={255}
                placeholder="Type here..."
            />
            <Input
                label="Company Description"
                value={value.companyDescription ?? ''}
                onChange={handleUpdateCompanyDescription}
                error={errors?.companyDescriptionError}
                maxLength={2000}
                placeholder="Type here..."
            />

            <CompanyTypeField
                label="Company Type"
                value={value ? value.companyType : []}
                onChange={handleUpdateCompanyType}
                error={errors?.companyTypeError || ''}
            />

            <div className="flex gap-4">
                <Input
                    label="Phone Number*"
                    value={value.phoneNumber ?? ''}
                    onChange={handleUpdatePhoneNumber}
                    error={errors?.phoneNumberError}
                    type="tel"
                    maxLength={20}
                    placeholder="Type here..."
                />
                <Input
                    label="Email*"
                    value={value.email ?? ''}
                    onChange={handleUpdateEmail}
                    error={errors?.emailError}
                    type="email"
                    maxLength={100}
                    placeholder="Type here..."
                />
            </div>
            <Input
                label="Address"
                value={value.address ?? ''}
                onChange={handleUpdateAddress}
                error={errors?.addressError}
                maxLength={500}
                placeholder="Type here..."
            />
            <Input
                label="Website"
                value={value.website ?? ''}
                onChange={handleUpdateWebsite}
                error={errors?.websiteError}
                maxLength={255}
                placeholder="Type here..."
            />
        </div>
    );
}
