'use client';

import { useState } from 'react';
import type { AccountType } from '@mangodb/shared';

import RegisterLayout from '@/components/register/RegisterLayout';
import RoleStep from '@/components/register/RoleStep';
import CompanyInfoStep, {
    type CompanyInfo,
} from '@/components/register/CompanyInfoStep';
import AccountInfoStep, {
    type AccountInfo,
} from '@/components/register/AccountStep';

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
        setErrorMessage('');
        setCurrentStep(RegisterStep.CompanyInfo);
    };

    const goToHome = () => {
        window.location.href = '/';
    };

    /* ================= SUBMIT ================= */

    const submitRegister = async () => {
        if (accountInfo.password !== accountInfo.confirmPassword) {
            setErrorMessage('Passwords do not match.');
            return;
        }
        setIsSubmitting(true);
        setErrorMessage('');

        // Clean empty string values so optional fields aren't validated as invalid URLs or strings
        const websiteValue = companyInfo.website.trim();
        const addressValue = companyInfo.address.trim();
        const descriptionValue = companyInfo.companyDescription.trim();

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
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const apiError =
                    data?.error?.details
                        ?.map(
                            (detail: { field: string; message: string }) =>
                                `${detail.field}: ${detail.message}`,
                        )
                        .join(', ') ||
                    data?.error?.message ||
                    data?.message ||
                    'Registration failed.';
                setErrorMessage(apiError);
                return;
            }

            if (data?.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
            }

            setCurrentStep(RegisterStep.Success);
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
            {errorMessage && (
                <div className="my-2 rounded-md bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200">
                    {errorMessage}
                </div>
            )}

            {currentStep === RegisterStep.SelectRole && (
                <RoleStep value={accountType} onChange={setAccountType} />
            )}

            {currentStep === RegisterStep.CompanyInfo && (
                <CompanyInfoStep
                    value={companyInfo}
                    onChange={setCompanyInfo}
                />
            )}

            {currentStep === RegisterStep.AccountInfo && (
                <AccountInfoStep
                    value={accountInfo}
                    onChange={setAccountInfo}
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
                        onClick={() => {
                            window.location.href = '/';
                        }}
                        className="
                            rounded-button
                            bg-[#3F6B80]
                            mt-2
                            px-[24px] py-[5px]
                            text-md text-[#FFFDF9]
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                            "
                    >
                        Go to Home
                    </button>
                </div>
            )}
        </RegisterLayout>
    );
}
