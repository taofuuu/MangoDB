'use client';

import { useState } from 'react';
import type { AccountType } from '@mangodb/shared';

import RegisterLayout from '@/components/register/RegisterLayout';
import RoleStep from '@/components/register/RoleStep';
import CompanyInfoStep, {
    CompanyType,
    type CompanyInfo,
} from '@/components/register/CompanyInfoStep';
import AccountStep, {
    type AccountInfo,
} from '@/components/register/AccountStep';
import { validateCompanyInfo, validateAccountInfo } from '@/lib/validation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Step = 1 | 2 | 3;

type AvailabilityResponse = {
    usernameAvailable: boolean;
    emailAvailable: boolean;
};

export default function RegisterPage() {
    /* =====================================================
     STEP
  ===================================================== */

    const [step, setStep] = useState<Step>(1);

    /* =====================================================
     ACCOUNT TYPE
  ===================================================== */

    const [accountType, setAccountType] = useState<AccountType | null>(null);

    /* =====================================================
     COMPANY INFO
  ===================================================== */

    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
        companyName: '',
        companyDescription: '',
        companyType: [],
        phoneNumber: '',
        email: '',
        address: '',
        website: '',
    });

    const [companyInfoErrors, setCompanyInfoErrors] = useState<
        Partial<Record<keyof CompanyInfo, string>>
    >({});

    /* =====================================================
     ACCOUNT INFO
  ===================================================== */

    const [accountInfo, setAccountInfo] = useState<AccountInfo>({
        username: '',
        password: '',
        confirmPassword: '',
    });

    const [accountInfoErrors, setAccountInfoErrors] = useState<{
        username?: string;
        password?: string;
        confirmPassword?: string;
    }>({});

    /* =====================================================
     AVAILABILITY
  ===================================================== */

    const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

    const [usernameAvailable, setUsernameAvailable] = useState<
        'idle' | 'checking' | 'available' | 'taken'
    >('idle');

    /* =====================================================
     ERROR / SUBMIT
  ===================================================== */

    const [serverError, setServerError] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleClearCompanyError = (field: keyof CompanyInfo) => {
        if (companyInfoErrors[field]) {
            setCompanyInfoErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const handleClearAccountError = (field: keyof AccountInfo) => {
        if (accountInfoErrors[field]) {
            setAccountInfoErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    /* =====================================================
     CHECK USERNAME / EMAIL AVAILABILITY
  ===================================================== */

    const checkAvailability = async (username: string, email: string) => {
        const normalizedUsername = username.trim().toLowerCase();

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedUsername || !normalizedEmail) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/check-availability`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: normalizedUsername,
                    email: normalizedEmail,
                }),
            });

            if (!response.ok) {
                return;
            }

            const data = (await response.json()) as AvailabilityResponse;

            setUsernameAvailable(
                data.usernameAvailable ? 'available' : 'taken',
            );

            setEmailAvailable(data.emailAvailable);
        } catch {
            // Final registration still has
            // server-side uniqueness checks.
        }
    };

    /* =====================================================
     USERNAME BLUR
  ===================================================== */

    const handleUsernameBlur = () => {
        const username = accountInfo.username.trim().toLowerCase();

        if (username.length < 3 || !/^[a-z0-9_]+$/.test(username)) {
            setUsernameAvailable('idle');
            return;
        }

        setUsernameAvailable('checking');

        void checkAvailability(accountInfo.username, companyInfo.email);
    };

    /* =====================================================
     STEP 1 → STEP 2
  ===================================================== */

    const goToStep2 = () => {
        if (!accountType) {
            return;
        }

        setServerError('');
        setStep(2);
    };

    /* =====================================================
     STEP 2 → STEP 3
  ===================================================== */

    const goToStep3 = () => {
        const errors = validateCompanyInfo(companyInfo);
        if (Object.keys(errors).length > 0) {
            setCompanyInfoErrors(errors);
            return;
        }

        setCompanyInfoErrors({});
        setServerError('');

        void checkAvailability(accountInfo.username, companyInfo.email);

        setStep(3);
    };

    /* =====================================================
     STEP 3 → SUBMIT
  ===================================================== */

    const submitRegister = async () => {
        setServerError('');

        /* ---------- account type ---------- */

        if (!accountType) {
            setStep(1);
            return;
        }

        /* ---------- client-side required field validation ---------- */

        const errors = validateAccountInfo(accountInfo);
        if (Object.keys(errors).length > 0) {
            setAccountInfoErrors(errors);
            return;
        }

        setAccountInfoErrors({});

        /* ---------- username availability ---------- */

        if (usernameAvailable !== 'available') {
            setServerError('Please choose an available username.');
            return;
        }

        /* ---------- submitting ---------- */

        setIsSubmitting(true);

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    company_name: companyInfo.companyName.trim(),

                    company_description:
                        companyInfo.companyDescription.trim() || undefined,

                    company_type: companyInfo.companyType
                        .map((type) => type.trim())
                        .filter(Boolean),

                    phone: companyInfo.phoneNumber.trim(),

                    email: companyInfo.email.trim().toLowerCase(),

                    address: companyInfo.address.trim() || undefined,

                    website: companyInfo.website.trim() || undefined,

                    account_type: accountType,

                    username: accountInfo.username.trim().toLowerCase(),

                    password: accountInfo.password,
                }),
            });

            const data = (await response.json().catch(() => null)) as {
                accessToken?: string;
                message?: string;
            } | null;

            /* ---------- server error ---------- */

            if (!response.ok) {
                setServerError(
                    data?.message ?? 'Registration failed. Please try again.',
                );

                return;
            }

            /* ---------- save token ---------- */

            if (data?.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
            }

            /* ---------- success ---------- */

            window.location.href = '/';
        } catch {
            setServerError(
                'Cannot connect to the server. Make sure the API is running.',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    /* =====================================================
     BACK BUTTON
  ===================================================== */

    const goBack = () => {
        setServerError('');

        if (step === 2) {
            setCompanyInfoErrors({});
            setStep(1);
            return;
        }

        if (step === 3) {
            setAccountInfoErrors({});
            setStep(2);
        }
    };

    /* =====================================================
     LAYOUT CONFIG
  ===================================================== */

    const layoutProps = {
        1: {
            title: 'Sign Up',
            subtitle: 'Company Role',

            showBack: false,

            nextLabel: 'Next',
            onNext: goToStep2,
            nextDisabled: !accountType,
        },

        2: {
            title: 'Sign Up',
            subtitle: 'Company Information',

            showBack: true,
            onBack: goBack,

            nextLabel: 'Next',
            onNext: goToStep3,

            nextDisabled: false,
        },

        3: {
            title: 'Sign Up',
            subtitle: 'Create Your Account',

            showBack: true,
            onBack: goBack,

            nextLabel: isSubmitting ? 'Creating...' : 'Create Account',

            onNext: submitRegister,

            nextDisabled: isSubmitting,
        },
    }[step];

    /* =====================================================
     RENDER
  ===================================================== */

    return (
        <RegisterLayout
            title={layoutProps.title}
            subtitle={layoutProps.subtitle}
            showBack={layoutProps.showBack}
            onBack={layoutProps.onBack}
            nextLabel={layoutProps.nextLabel}
            onNext={layoutProps.onNext}
            nextDisabled={layoutProps.nextDisabled}
        >
            {/* ================= STEP 1 ================= */}

            {step === 1 && (
                <RoleStep value={accountType} onChange={setAccountType} />
            )}

            {/* ================= STEP 2 ================= */}

            {step === 2 && (
                <CompanyInfoStep
                    value={companyInfo}
                    onChange={setCompanyInfo}
                    errors={companyInfoErrors}
                    onClearError={handleClearCompanyError}
                />
            )}

            {/* ================= STEP 3 ================= */}

            {step === 3 && (
                <AccountStep
                    value={accountInfo}
                    onChange={setAccountInfo}
                    usernameAvailability={usernameAvailable}
                    serverError={serverError}
                    isSubmitting={isSubmitting}
                    onUsernameBlur={handleUsernameBlur}
                    onSubmit={submitRegister}
                    errors={accountInfoErrors}
                    onClearError={handleClearAccountError}
                />
            )}
        </RegisterLayout>
    );
}
