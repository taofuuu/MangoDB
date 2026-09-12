'use client';

// import { CompanyTypeSelector } from '@/components/sm-detail/CompanyTypeSelector';
import { SimpleTextInput } from '@/components/sm-detail/SimpleTextInput';
import { useEffect, useState } from 'react';
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
    onChange: (value: CompanyInfo) => void;
    errors?: CompanyInfoError;
    onClearError?: (field: keyof CompanyInfo) => void;
};

// TODO: Replace with company types from DB/API.
// export enum CompanyType {
//     SoftwareHouse = 'Software house',
//     Consultancy = 'Consultancy',
// }

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

    useEffect(() => {});

    const handleUpdateCompanyType = (companyType: string[]) => {
        setCompanyInfo({ ...companyInfo, companyType: companyType });
        if (companyType.length > 0) {
            onClearError?.('companyType');
        }
    };

    const handleUpdateCompanyName = (companyName: string) => {
        setCompanyInfo({ ...companyInfo, companyName: companyName });
        if (companyName.trim()) {
            onClearError?.('companyName');
        }
    };

    const handleUpdateCompanyDescription = (companyDescription: string) => {
        setCompanyInfo({
            ...companyInfo,
            companyDescription: companyDescription,
        });
        onClearError?.('companyDescription');
    };

    const handleUpdatePhoneNumber = (phoneNumber: string) => {
        setCompanyInfo({
            ...companyInfo,
            phoneNumber: phoneNumber,
        });
        if (phoneNumber.trim()) {
            onClearError?.('phoneNumber');
        }
    };

    // const validatePhoneNumber = (num: string) => {
    //     if (Number.isNaN(Number(num))) return false;
    //     if (num.length > 10) return false;
    //     if (num[0] !== '0') {
    //         if (num.length === 0) return true;
    //         else return false;
    //     }
    //     return true;
    // };

    const handleUpdateEmail = (email: string) => {
        setCompanyInfo({ ...companyInfo, email: email });
        if (email.trim()) {
            onClearError?.('email');
        }
    };

    const handleUpdateAddress = (address: string) => {
        setCompanyInfo({ ...companyInfo, address: address });
        onClearError?.('address');
    };

    const handleUpdateWebsite = (website: string) => {
        setCompanyInfo({ ...companyInfo, website: website });
        onClearError?.('website');
    };

    useEffect(() => {
        console.log('companyInfo is ....');
        console.log(companyInfo);
        onChange(companyInfo);
    }, [companyInfo]);

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

            {/* <CompanyTypeSelector
                title="Company Type *"
                companyTypeList={[
                    CompanyType.SoftwareHouse,
                    CompanyType.Consultancy,
                ]}
                onChange={handleUpdateCompanyType}
                initValues={value ? value.companyType : []}
                error={errors?.companyTypeError || ''}
                required
            /> */}
            <div className="flex gap-4">
                <SimpleTextInput
                    title="Phone Number"
                    onChange={handleUpdatePhoneNumber}
                    initValue={value ? value.phoneNumber : ''}
                    // validate={validatePhoneNumber}
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
