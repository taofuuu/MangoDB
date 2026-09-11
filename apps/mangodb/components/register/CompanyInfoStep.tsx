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
};

// TODO: Replace with company types from DB/API.
export enum CompanyType {
    SoftwareHouse = 'Software house',
    Consultancy = 'Consultancy',
}

export default function CompanyInfoStep({
    value,
    onChange,
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

    const handleUpdateCompanyType = (companyType: CompanyType[]) => {
        setCompanyInfo({ ...companyInfo, companyType: companyType });
    };

    const handleUpdateCompanyName = (companyName: string) => {
        setCompanyInfo({ ...companyInfo, companyName: companyName });
    };

    const handleUpdateCompanyDescription = (companyDescription: string) => {
        setCompanyInfo({
            ...companyInfo,
            companyDescription: companyDescription,
        });
    };

    const handleUpdatePhoneNumber = (phoneNumber: string) => {
        setCompanyInfo({
            ...companyInfo,
            phoneNumber: phoneNumber,
        });
    };

    const handleUpdateEmail = (email: string) => {
        setCompanyInfo({ ...companyInfo, email: email });
    };

    const handleUpdateAddress = (address: string) => {
        setCompanyInfo({ ...companyInfo, address: address });
    };

    const handleUpdateWebsite = (website: string) => {
        setCompanyInfo({ ...companyInfo, website: website });
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
            />
            <SimpleTextInput
                title="Company Description"
                onChange={handleUpdateCompanyDescription}
                initValue={value ? value.companyDescription : ''}
            />
            <CompanyTypeSelector
                title="Company Type"
                companyTypeList={[
                    CompanyType.SoftwareHouse,
                    CompanyType.Consultancy,
                ]}
                onChange={handleUpdateCompanyType}
                initValues={value ? value.companyType : []}
            />
            <div className="flex gap-4">
                <SimpleTextInput
                    title="Phone Number"
                    onChange={handleUpdatePhoneNumber}
                    initValue={value ? value.phoneNumber : ''}
                />
                <SimpleTextInput
                    title="Email"
                    onChange={handleUpdateEmail}
                    initValue={value ? value.email : ''}
                />
            </div>
            <SimpleTextInput
                title="Address"
                onChange={handleUpdateAddress}
                initValue={value ? value.address : ''}
            />
            <SimpleTextInput
                title="Website"
                onChange={handleUpdateWebsite}
                initValue={value ? value.website : ''}
            />
        </div>
    );
}
