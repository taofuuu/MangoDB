'use client';

import { CompanyTypeSelector } from '@/components/sm-detail/CompanyTypeSelector';
import { SimpleTextInput } from '@/components/sm-detail/SimpleTextInput';
import { useEffect, useState } from 'react';

enum CompanyRole {
    Receiver = 'Receiver',
    Provider = 'Provider',
    Dual = 'Dual',
}

export enum CompanyType {
    SoftwareHouse = 'Software house',
    Consultancy = 'Consultancy',
}

// Use this to determine which stage of registraion is user on (change between Register1-3)
enum RegisterStage {
    CompanyRole,
    CompanyInformation,
    CreateYourAccount,
}

interface RegisterPayload {
    companyRole: CompanyRole;
    companyName: string;
    companyDescription: string;
    companyType: CompanyType[];
    phoneNumber: number;
    email: string;
    address: string;
    website: string;
    username: string;
    password: string;
}

export default function RegisterPage() {
    const [registerStage, setRegisterStage] = useState<RegisterStage>(
        RegisterStage.CompanyRole,
    );
    const [registerPayload, setRegisterPayload] = useState<
        Partial<RegisterPayload>
    >({});

    const handleUpdateCompanyType = (cType: CompanyType[]) => {
        setRegisterPayload({ ...registerPayload, companyType: cType });
    };

    const handleUpdateCompanyName = (cName: string) => {
        setRegisterPayload({ ...registerPayload, companyName: cName });
    };

    const handleUpdateCompanyDescription = (cName: string) => {
        setRegisterPayload({ ...registerPayload, companyDescription: cName });
    };

    const handleUpdatePhoneNumber = (newData: string) => {
        setRegisterPayload({
            ...registerPayload,
            phoneNumber: Number(newData),
        });
    };

    const validatePhoneNUmber = (num: string) => {
        if (Number.isNaN(Number(num))) return false;
        if (num.length > 10) return false;
        // if(num[0] != '0') return false;
        return true;
    };

    const handleUpdateEmail = (newData: string) => {
        setRegisterPayload({ ...registerPayload, email: newData });
    };

    const handleUpdateAddress = (newData: string) => {
        setRegisterPayload({ ...registerPayload, address: newData });
    };

    const handleUpdateWebsite = (newData: string) => {
        setRegisterPayload({ ...registerPayload, website: newData });
    };

    useEffect(() => {
        console.log('registerPayload is ....');
        console.log(registerPayload);
    }, [registerPayload]);

    return (
        <div className="register-page">
            <h1>Register</h1>
            <SimpleTextInput
                title="Company Name"
                onChange={handleUpdateCompanyName}
            />
            <SimpleTextInput
                title="Company Description"
                onChange={handleUpdateCompanyDescription}
            />
            <CompanyTypeSelector
                title="Company Type"
                companyTypeList={[
                    CompanyType.SoftwareHouse,
                    CompanyType.Consultancy,
                ]}
                onChange={handleUpdateCompanyType}
            />
            <div className="flex gap-4">
                <SimpleTextInput
                    title="Phone Number"
                    onChange={handleUpdatePhoneNumber}
                    validate={validatePhoneNUmber}
                />
                <SimpleTextInput title="Email" onChange={handleUpdateEmail} />
            </div>
            <SimpleTextInput title="Address" onChange={handleUpdateAddress} />
            <SimpleTextInput title="Website" onChange={handleUpdateWebsite} />
        </div>
    );
}
