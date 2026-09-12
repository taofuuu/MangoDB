'use client';

import { useState } from 'react';
import type { AccountType, SessionResponse } from '@mangodb/shared';
import { useRouter } from 'next/navigation';

import RegisterLayout from '@/components/register/RegisterLayout';
import RoleStep from '@/components/register/RoleStep';
import CompanyInfoStep, {
    CompanyInfoError,
    type CompanyInfo,
} from '@/components/register/CompanyInfoStep';
import AccountInfoStep, {
    AccountInfoError,
    type AccountInfo,
} from '@/components/register/AccountStep';
import {
    validateCompanyDescription,
    validateCompanyName,
    validateCompanyType,
    validateConfirmPassword,
    validateContactEmail,
    validateLocation,
    validatePassword,
    validatePhone,
    validateUsername,
    validateWebsite,
} from '@/lib/validation';
import { apiFetch } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export enum RegisterStep {
    SelectRole = 'SELECT_ROLE',
    CompanyInfo = 'COMPANY_INFO',
    AccountInfo = 'ACCOUNT_INFO',
    Success = 'SUCCESS',
}

export default function RegisterPage() {
    /* ================= STATE ================= */

    const [currentStep, setCurrentStep] = useState<RegisterStep>(
        RegisterStep.SelectRole,
    );
    const [accountType, setAccountType] = useState<AccountType | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');

    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
        companyName: '',
        companyDescription: '',
        companyType: [],
        phoneNumber: '',
        email: '',
        address: '',
        website: '',
    });

    const [accountInfo, setAccountInfo] = useState<AccountInfo>({
        username: '',
        password: '',
        confirmPassword: '',
    });

    const [accountInfoError, setAccountInfoError] = useState<AccountInfoError>(
        {},
    );

    const [companyInfoError, setCompanyInfoError] = useState<CompanyInfoError>(
        {},
    );

    /* ================= NAVIGATION ================= */

    const goBack = () => {
        setErrorMessage('');
        if (currentStep === RegisterStep.AccountInfo) {
            setCurrentStep(RegisterStep.SelectRole);
        } else if (currentStep === RegisterStep.CompanyInfo) {
            setCurrentStep(RegisterStep.AccountInfo);
        }
    };

    const goToAccountInfo = () => {
        setErrorMessage('');
        setCurrentStep(RegisterStep.AccountInfo);
    };

    const goToCompanyInfo = () => {
        const usernameError = validateUsername(accountInfo.username) || '';
        const passwordError = validatePassword(accountInfo.password) || '';
        const confirmPasswordError =
            validateConfirmPassword(
                accountInfo.password,
                accountInfo.confirmPassword,
            ) || '';

        if (usernameError || passwordError || confirmPasswordError) {
            setAccountInfoError({
                ...accountInfoError,
                usernameError,
                passwordError,
                confirmPasswordError,
            });
        } else {
            setCurrentStep(RegisterStep.CompanyInfo);
            setAccountInfoError({});
        }
    };

    const router = useRouter();

    const goToHome = () => router.push('/');

    /* ================= SUBMIT ================= */

    const submitRegister = async () => {
        setIsSubmitting(true);

        // Clean empty string values so optional fields aren't validated as invalid URLs or strings
        const websiteValue = companyInfo.website.trim();
        const addressValue = companyInfo.address.trim();
        const descriptionValue = companyInfo.companyDescription.trim();

        const companyNameError =
            validateCompanyName(companyInfo.companyName) || '';
        const companyDescriptionError =
            validateCompanyDescription(companyInfo.companyDescription) || '';
        const companyTypeError =
            validateCompanyType(companyInfo.companyType) || '';
        const phoneNumberError = validatePhone(companyInfo.phoneNumber) || '';
        const emailError = validateContactEmail(companyInfo.email) || '';
        const addressError = validateLocation(companyInfo.address) || '';
        const websiteError = validateWebsite(companyInfo.website) || '';

        const payload = {
            company_name: companyInfo.companyName,
            company_description: descriptionValue || undefined,
            company_type: companyInfo.companyType,
            phone: companyInfo.phoneNumber,
            email: companyInfo.email,
            address: addressValue || undefined,
            website: websiteValue !== '' ? websiteValue : undefined,
            account_type: accountType,
            username: accountInfo.username,
            password: accountInfo.password,
        };

        try {
            if (
                companyNameError ||
                companyDescriptionError ||
                companyTypeError ||
                phoneNumberError ||
                emailError ||
                addressError ||
                websiteError
            ) {
                setCompanyInfoError({
                    ...companyInfoError,
                    companyNameError,
                    companyDescriptionError,
                    companyTypeError,
                    phoneNumberError,
                    emailError,
                    addressError,
                    websiteError,
                });
            } else {
                setCurrentStep(RegisterStep.Success);
                setCompanyInfoError({});
                const data = await apiFetch<SessionResponse>(`/auth/register`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });

                if (data?.accessToken) {
                    localStorage.setItem('accessToken', data.accessToken);
                }
            }
        } catch {
            setErrorMessage('Unable to connect to the server.');
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ================= LAYOUT CONFIG ================= */

    const layoutProps = {
        [RegisterStep.SelectRole]: {
            title: 'Sign Up',
            subtitle: 'Company Role',
            showBack: false,
            nextLabel: 'Next',
            onNext: goToAccountInfo,
        },
        [RegisterStep.AccountInfo]: {
            title: 'Sign Up',
            subtitle: 'Create Your Account',
            showBack: true,
            nextLabel: 'Next',
            onNext: goToCompanyInfo,
        },
        [RegisterStep.CompanyInfo]: {
            title: 'Sign Up',
            subtitle: 'Company Information',
            showBack: true,
            nextLabel: isSubmitting ? 'Creating...' : 'Create Account',
            onNext: submitRegister,
        },
        [RegisterStep.Success]: {
            title: 'Sign Up',
            subtitle: 'Complete',
            showBack: false,
            nextLabel: '',
            onNext: undefined,
        },
    }[currentStep];

    /* ================= RENDER ================= */

    return (
        <RegisterLayout
            title={layoutProps.title}
            subtitle={layoutProps.subtitle}
            showBack={layoutProps.showBack}
            onBack={goBack}
            nextLabel={layoutProps.nextLabel}
            onNext={layoutProps.onNext}
            nextDisabled={
                isSubmitting ||
                (currentStep === RegisterStep.SelectRole && !accountType)
            }
        >
            {/* Server Error Message Display */}
            {/* {errorMessage && (
                <div className="my-2 rounded-md bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200">
                    {errorMessage}
                </div>
            )} */}

            {currentStep === RegisterStep.SelectRole && (
                <RoleStep value={accountType} onChange={setAccountType} />
            )}

            {currentStep === RegisterStep.CompanyInfo && (
                <CompanyInfoStep
                    value={companyInfo}
                    onChange={setCompanyInfo}
                    errors={companyInfoError}
                    onClearError={(field) =>
                        setCompanyInfoError((prev) => ({
                            ...prev,
                            [`${field}Error`]: undefined,
                        }))
                    }
                />
            )}

            {currentStep === RegisterStep.AccountInfo && (
                <AccountInfoStep
                    value={accountInfo}
                    onChange={setAccountInfo}
                    errors={accountInfoError}
                />
            )}

            {currentStep === RegisterStep.Success && (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 text-3xl font-bold">
                        ✓
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800">
                        Success
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Your account has been created successfully.
                    </p>
                    <button
                        type="button"
                        onClick={goToHome}
                        className="
                            rounded-button
                            bg-[#3F6B80]
                            mt-2
                            px-[24px] py-[5px]
                            text-md text-[#FFFDF9]
                            "
                    >
                        Go to Home
                    </button>
                </div>
            )}
        </RegisterLayout>
    );
}
