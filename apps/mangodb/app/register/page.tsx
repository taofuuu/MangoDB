'use client';

import { useState } from 'react';
import type { RegisterAccountType, RegisterRequest } from '@mangodb/shared';
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
} from '@/components/register/AccountInfoStep';
import ConsentModal from '@/components/register/ConsentModal';
import FieldError from '@/components/ui/FieldError';
import {
    validateConfirmPassword,
    validatePassword,
    validateUsername,
} from '@/lib/validation/auth';
import {
    normalizePhone,
    normalizeWebsiteUrl,
    validateCompanyDescription,
    validateCompanyName,
    validateCompanyType,
    validateContactEmail,
    validateLocation,
    validatePhone,
    validateWebsite,
} from '@/lib/validation/company';
import { toFormErrors } from '@/lib/validation/formErrors';
import { register } from '@/lib/session';
import { TERMS_INTRO, TERMS_OF_SERVICE } from '@/lib/terms';
import { PRIVACY_INTRO, PRIVACY_POLICY } from '@/lib/privacy';

// Which input each field the API can reject belongs under. Username and
// password live on the previous step, so their messages are held until the
// user is sent back to it.
const REGISTER_FIELDS = {
    companyName: 'companyName',
    companyDescription: 'companyDescription',
    companyType: 'companyType',
    phone: 'phoneNumber',
    email: 'email',
    address: 'address',
    website: 'website',
    username: 'username',
    password: 'password',
    tosAccepted: 'tosAccepted',
} as const;

const TOS_REQUIRED_MESSAGE =
    'You must accept the Terms of Service to create an account.';
const PRIVACY_REQUIRED_MESSAGE =
    'You must accept the Privacy Policy (PDPA) to create an account.';

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

    // US1-13 and #193. Consent is given in two dialogs, the Terms of Service
    // and then the Privacy Policy (PDPA). Create Account opens whichever has
    // not been accepted yet, and only sends once both are.
    const [tosAccepted, setTosAccepted] = useState(false);
    const [isTosOpen, setIsTosOpen] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [consentError, setConsentError] = useState('');

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

        // The form is valid, so the only thing left between the user and an
        // account is consent. Ask for it rather than send a body the API
        // rejects.
        if (!tosAccepted) {
            setIsTosOpen(true);
            return;
        }

        if (!privacyAccepted) {
            setIsPrivacyOpen(true);
            return;
        }

        await sendRegister();
    };

    // Accepting the last dialog is pressing Create Account a second time: the
    // form was already validated before the first dialog opened.
    const acceptTerms = () => {
        setTosAccepted(true);
        setConsentError('');
        setIsTosOpen(false);
        if (privacyAccepted) {
            void sendRegister();
        } else {
            setIsPrivacyOpen(true);
        }
    };

    const declineTerms = () => {
        setTosAccepted(false);
        setIsTosOpen(false);
        setConsentError(TOS_REQUIRED_MESSAGE);
    };

    const acceptPrivacy = () => {
        setPrivacyAccepted(true);
        setConsentError('');
        setIsPrivacyOpen(false);
        void sendRegister();
    };

    const declinePrivacy = () => {
        setPrivacyAccepted(false);
        setIsPrivacyOpen(false);
        setConsentError(PRIVACY_REQUIRED_MESSAGE);
    };

    const sendRegister = async () => {
        // The role step's Next button is disabled until one is picked.
        if (!accountType) return;
        setIsSubmitting(true);

        // Optional fields go out as undefined rather than an empty string,
        // which the API would read as a value and reject.
        const payload: RegisterRequest = {
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
            password: accountInfo.password ?? '',
            // Only reachable after Accept. The API takes nothing but `true`.
            tosAccepted: true,
        };

        try {
            await register(payload);
            setCurrentStep(RegisterStep.Success);
        } catch (error) {
            const { fields, message } = toFormErrors(error, REGISTER_FIELDS);

            // username and password belong to the account step, so a rejection
            // there sends the user back to the boxes it is about.
            const {
                username,
                password,
                tosAccepted: tosField,
                ...companyFields
            } = fields;

            // The API did not record consent, so the next Create Account has
            // to ask again.
            if (tosField) {
                setTosAccepted(false);
                setConsentError(tosField);
            }

            if (username || password) {
                setAccountInfoError({
                    usernameError: username ?? '',
                    passwordError: password ?? '',
                });
                setCurrentStep(RegisterStep.AccountInfo);
            }

            setCompanyInfoError({
                companyNameError: companyFields.companyName ?? '',
                companyDescriptionError: companyFields.companyDescription ?? '',
                companyTypeError: companyFields.companyType ?? '',
                phoneNumberError: companyFields.phoneNumber ?? '',
                emailError: companyFields.email ?? '',
                addressError: companyFields.address ?? '',
                websiteError: companyFields.website ?? '',
            });
            setErrorMessage(message ?? '');
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
                <div className="my-2 rounded-md border border-danger-tint bg-danger-wash p-3 type-sm font-medium text-danger">
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

            {currentStep === RegisterStep.CompanyInfo && (
                <FieldError message={consentError} />
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
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint text-brand type-hd !font-[700]">
                        ✓
                    </div>
                    <h1 className="type-hd !font-[700] text-ink">Success</h1>
                    <p className="mt-2 text-ink-soft">
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

            <ConsentModal
                isOpen={isTosOpen}
                title="Terms of Service"
                intro={TERMS_INTRO}
                sections={TERMS_OF_SERVICE}
                onAccept={acceptTerms}
                onDecline={declineTerms}
            />

            <ConsentModal
                isOpen={isPrivacyOpen}
                title="Privacy Policy (PDPA)"
                intro={PRIVACY_INTRO}
                sections={PRIVACY_POLICY}
                onAccept={acceptPrivacy}
                onDecline={declinePrivacy}
            />
        </RegisterLayout>
    );
}
