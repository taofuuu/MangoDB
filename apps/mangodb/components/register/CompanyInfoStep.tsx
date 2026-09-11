'use client';

import { CompanyTypeSelector } from '@/components/sm-detail/CompanyTypeSelector';
import { SimpleTextInput } from '@/components/sm-detail/SimpleTextInput';
import { useEffect, useState } from 'react';

export type CompanyInfo = {
    companyName: string;
    companyDescription: string;
    companyType: CompanyType[];
    phoneNumber: string;
    email: string;
    address: string;
    website: string;
};

type CompanyInfoStepProps = {
    value: CompanyInfo;
    onChange: (value: CompanyInfo) => void;
    errors?: Partial<Record<keyof CompanyInfo, string>>;
    onClearError?: (field: keyof CompanyInfo) => void;
};

// TODO: Replace with company types from DB/API.
export enum CompanyType {
    SoftwareHouse = 'Software house',
    Consultancy = 'Consultancy',
}

export default function CompanyInfoStep({
    value,
    onChange,
    errors,
    onClearError,
}: CompanyInfoStepProps) {
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(
        value ?? {
            companyName: '',
            companyDescription: '',
            companyType: [],
            phoneNumber: '',
            email: '',
            address: '',
            website: '',
        },
    );

    const handleUpdateCompanyType = (cType: CompanyType[]) => {
        setCompanyInfo((prev) => ({ ...prev, companyType: cType }));
        if (cType.length > 0) {
            onClearError?.('companyType');
        }
    };

    const handleUpdateCompanyName = (cName: string) => {
        setCompanyInfo((prev) => ({ ...prev, companyName: cName }));
        if (cName.trim()) {
            onClearError?.('companyName');
        }
    };

    const handleUpdateCompanyDescription = (desc: string) => {
        setCompanyInfo((prev) => ({ ...prev, companyDescription: desc }));
        onClearError?.('companyDescription');
    };

    const handleUpdatePhoneNumber = (phone: string) => {
        setCompanyInfo((prev) => ({ ...prev, phoneNumber: phone }));
        if (phone.trim()) {
            onClearError?.('phoneNumber');
        }
    };

    const validatePhoneNUmber = (num: string) => {
        if (Number.isNaN(Number(num))) return false;
        if (num.length > 10) return false;
        if (num[0] !== '0') {
            if (num.length === 0) return true;
            else return false;
        }
        return true;
    };

    const handleUpdateEmail = (email: string) => {
        setCompanyInfo((prev) => ({ ...prev, email }));
        if (email.trim()) {
            onClearError?.('email');
        }
    };

    const handleUpdateAddress = (address: string) => {
        setCompanyInfo((prev) => ({ ...prev, address }));
        onClearError?.('address');
    };

    const handleUpdateWebsite = (website: string) => {
        setCompanyInfo((prev) => ({ ...prev, website }));
        onClearError?.('website');
    };

    useEffect(() => {
        onChange(companyInfo);
    }, [companyInfo, onChange]);

    return (
        <div className="company-info-page my-5 flex flex-col gap-5">
            <SimpleTextInput
                title="Company Name"
                onChange={handleUpdateCompanyName}
                initValue={value ? value.companyName : ''}
                error={errors?.companyName}
                required
                maxLength={255}
            />
            <SimpleTextInput
                title="Company Description"
                onChange={handleUpdateCompanyDescription}
                initValue={value ? value.companyDescription : ''}
                error={errors?.companyDescription}
                maxLength={2000}
            />
            <CompanyTypeSelector
                title="Company Type"
                companyTypeList={[
                    CompanyType.SoftwareHouse,
                    CompanyType.Consultancy,
                ]}
                onChange={handleUpdateCompanyType}
                initValues={value ? value.companyType : []}
                error={errors?.companyType}
                required
            />
            <div className="flex gap-4">
                <SimpleTextInput
                    title="Phone Number"
                    onChange={handleUpdatePhoneNumber}
                    validate={validatePhoneNUmber}
                    initValue={value ? value.phoneNumber : ''}
                    error={errors?.phoneNumber}
                    required
                    type="tel"
                    maxLength={20}
                />
                <SimpleTextInput
                    title="Email"
                    onChange={handleUpdateEmail}
                    initValue={value ? value.email : ''}
                    error={errors?.email}
                    required
                    type="email"
                    maxLength={100}
                />
            </div>
            <SimpleTextInput
                title="Address"
                onChange={handleUpdateAddress}
                initValue={value ? value.address : ''}
                error={errors?.address}
                maxLength={500}
            />
            <SimpleTextInput
                title="Website"
                onChange={handleUpdateWebsite}
                initValue={value ? value.website : ''}
                error={errors?.website}
                maxLength={255}
            />
        </div>
    );
}
