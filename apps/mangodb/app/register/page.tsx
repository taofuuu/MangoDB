'use client';

import { useState } from 'react';
import type {
    RegisterAccountType,
    RegisterRequest,
    SessionResponse,
} from '@mangodb/shared';
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
    normalizePhone,
    normalizeWebsiteUrl,
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
import { apiFetch, ApiRequestError } from '@/lib/api';

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
    // RegisterAccountType, not AccountType: it excludes ADMIN, which
    // registerSchema rejects at runtime anyway. The narrow type was built for
    // exactly this, so the form cannot even assemble a body the API refuses.
    const [accountType, setAccountType] = useState<RegisterAccountType | null>(
        null,
    );
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
        setErrorMessage('');

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
        setErrorMessage('');

        // contactEmail is optional on the profile, but registration needs one
        // to sign in with, so the required check belongs here.
        const emailError = companyInfo.email.trim()
            ? validateContactEmail(companyInfo.email) || ''
            : 'Email is required.';

        const errors: CompanyInfoError = {
            companyNameError:
                validateCompanyName(companyInfo.companyName) || '',
            companyDescriptionError:
                validateCompanyDescription(companyInfo.companyDescription) ||
                '',
            companyTypeError:
                validateCompanyType(companyInfo.companyType) || '',
            phoneNumberError: validatePhone(companyInfo.phoneNumber) || '',
            emailError,
            addressError: validateLocation(companyInfo.address) || '',
            websiteError: validateWebsite(companyInfo.website) || '',
        };

        if (Object.values(errors).some(Boolean)) {
            setCompanyInfoError(errors);
            return;
        }

        setCompanyInfoError({});
        setIsSubmitting(true);

        // Optional fields go out as undefined rather than an empty string,
        // which the API would read as a value and reject.
        const payload = {
            companyName: companyInfo.companyName,
            companyDescription:
                companyInfo.companyDescription.trim() || undefined,
            companyType: companyInfo.companyType,
            phone: normalizePhone(companyInfo.phoneNumber),
            email: companyInfo.email,
            address: companyInfo.address.trim() || undefined,
            website: normalizeWebsiteUrl(companyInfo.website) ?? undefined,
            accountType,
            username: accountInfo.username,
            password: accountInfo.password,
        };

        try {
            // The session is an httpOnly cookie set on this response, so
            // there is nothing to store. The accessToken in the body is for
            // callers that are not a browser — curl, Postman.
            await apiFetch<SessionResponse>('/auth/register', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            setCurrentStep(RegisterStep.Success);
        } catch (error) {
            if (error instanceof ApiRequestError) {
                const details = error.details
                    .map(({ field, message }) => `${field}: ${message}`)
                    .join(', ');

                setErrorMessage(details || error.message);
            } else {
                setErrorMessage('Unable to connect to the server.');
            }
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
                <div className="my-2 rounded-md border border-red-200 bg-red-50 p-3 type-sm font-medium text-red-600">
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
                            bg-brand-dark
                            mt-2
                            px-[24px] py-[5px]
                            type-md text-surface
                            "
                    >
                        Go to Home
                    </button>
                </div>
            )}
        </RegisterLayout>
    );
}
