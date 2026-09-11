import type { ProfileFormData } from '@/components/forms/CompanyProfileForm';

export type ProfileErrors = Partial<Record<keyof ProfileFormData, string>>;

export const PREDEFINED_COMPANY_TYPES = [
    'Technology consultant',
    'Software House',
    'FinTech',
    'AI Lab',
    'SME',
    'E-Commerce',
] as const;

// 1. Company Name: Standard text string, required, max character limits.
export function validateCompanyName(value: string | undefined): string | null {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
        return 'Company name is required.';
    }
    if (trimmed.length > 255) {
        return 'Company name cannot exceed 255 characters.';
    }
    return null;
}

// 2. Contact Email: Required, must follow standard email format (company@domain.com), max 100 chars.
export function validateContactEmail(
    value: string | null | undefined,
): string | null {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
        return 'Email address is required.';
    }
    if (trimmed.length > 100) {
        return 'Email address cannot exceed 100 characters.';
    }
    // Check standard email conventions: must have @ and a domain with an extension (e.g. .com)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
        return 'Please enter a valid email address (e.g., company@domain.com).';
    }
    return null;
}

// 3. Phone Number: Must be 9 or 10 digits, without hyphen (-) or plus (+).
export function validatePhone(value: string | undefined): string | null {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
        return 'Phone number is required.';
    }
    if (
        /[a-zA-Z]/.test(trimmed) ||
        /[+\-]/.test(trimmed) ||
        !/^\d+$/.test(trimmed) ||
        trimmed.length < 9 ||
        trimmed.length > 10
    ) {
        return 'Please provide a valid phone number';
    }
    return null;
}

// 4. Website: Optional, but if provided must follow valid URL structure (http://, https://, or www.domain.com).
export function validateWebsite(
    value: string | null | undefined,
): string | null {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
        return null;
    }
    if (trimmed.length > 255) {
        return 'Website URL cannot exceed 255 characters.';
    }

    // Accepts http://, https://, or standard domain formats like www.domain.com / domain.com
    const urlPattern =
        /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/i;

    if (!urlPattern.test(trimmed)) {
        return 'Please enter a valid website URL (e.g., https://example.com or www.example.com).';
    }

    return null;
}

// Normalizes website so standard domain strings like "www.domain.com" become "https://www.domain.com"
// to conform to backend z.url() validation.
export function normalizeWebsiteUrl(
    value: string | null | undefined,
): string | null {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
        return null;
    }
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    return `https://${trimmed}`;
}

// 5. Company Type: Array/list of tags, required (at least 1 tag), max 10 tags, each up to 100 chars.
export function validateCompanyType(tags: string[] | undefined): string | null {
    if (!tags || tags.length === 0) {
        return 'Select at least one company type.';
    }
    if (tags.length > 10) {
        return 'You can select at most 10 company types.';
    }
    for (const tag of tags) {
        const trimmed = tag.trim();
        if (!trimmed) {
            return 'Company type cannot be blank.';
        }
        if (trimmed.length > 100) {
            return 'Each company type cannot exceed 100 characters.';
        }
    }
    return null;
}

// 6. Company Description: Optional freeform text, max 1000 characters.
export function validateCompanyDescription(
    value: string | null | undefined,
): string | null {
    const text = value ?? '';
    if (text.length > 1000) {
        return 'Company description cannot exceed 1000 characters.';
    }
    return null;
}

// 7. Company Location (address): Optional freeform text, max 500 characters (database VarChar(500)).
export function validateLocation(
    value: string | null | undefined,
): string | null {
    const text = value ?? '';
    if (text.length > 500) {
        return 'Company location cannot exceed 500 characters.';
    }
    return null;
}

// 8. Service Terms (Provider specific): Optional freeform text, max 2000 characters.
export function validateServiceTerms(
    value: string | null | undefined,
): string | null {
    const text = value ?? '';
    if (text.length > 2000) {
        return 'Service terms cannot exceed 2000 characters.';
    }
    return null;
}

// 9. Company Warranty Policy (Provider specific): Optional freeform text, max 2000 characters.
export function validateWarrantyPolicy(
    value: string | null | undefined,
): string | null {
    const text = value ?? '';
    if (text.length > 2000) {
        return 'Company warranty policy cannot exceed 2000 characters.';
    }
    return null;
}

// Helper to run common profile validations (shared between Provider and Receiver)
function runCommonValidations(data: ProfileFormData): ProfileErrors {
    const errors: ProfileErrors = {};

    const nameErr = validateCompanyName(data.company_name);
    if (nameErr) errors.company_name = nameErr;

    const emailErr = validateContactEmail(data.contact_email);
    if (emailErr) errors.contact_email = emailErr;

    const phoneErr = validatePhone(data.phone);
    if (phoneErr) errors.phone = phoneErr;

    const webErr = validateWebsite(data.website);
    if (webErr) errors.website = webErr;

    const typeErr = validateCompanyType(data.company_type);
    if (typeErr) errors.company_type = typeErr;

    const descErr = validateCompanyDescription(data.company_description);
    if (descErr) errors.company_description = descErr;

    const locErr = validateLocation(data.address);
    if (locErr) errors.address = locErr;

    return errors;
}

// Global validator for Provider Profile (includes Service Terms & Warranty Policy)
export function validateProviderProfile(data: ProfileFormData): ProfileErrors {
    const errors = runCommonValidations(data);

    const termsErr = validateServiceTerms(data.service_term);
    if (termsErr) errors.service_term = termsErr;

    const warrantyErr = validateWarrantyPolicy(data.warranty_policy);
    if (warrantyErr) errors.warranty_policy = warrantyErr;

    return errors;
}

// Global validator for Receiver Profile (strictly standard company information)
export function validateReceiverProfile(data: ProfileFormData): ProfileErrors {
    return runCommonValidations(data);
}

// General validator that dispatches to Provider or Receiver validation based on account_type or explicit flag
export function validateProfile(
    data: ProfileFormData,
    isProvider?: boolean,
): ProfileErrors {
    const providerMode =
        isProvider ??
        (data.account_type === 'PROVIDER' || data.account_type === 'BOTH');

    return providerMode
        ? validateProviderProfile(data)
        : validateReceiverProfile(data);
}

// 10. Registration: Username validation
// Required field, letters, numbers, and underscores only.
export function validateUsername(value: string | undefined): string | null {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
        return 'Username is required.';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return 'Use letters, numbers, and underscores only.';
    }
    return null;
}

// 11. Registration: Password validation
// Required field.
export function validatePassword(value: string | undefined): string | null {
    const text = value ?? '';
    if (!text) {
        return 'Password is required.';
    }
    return null;
}

// 12. Registration: Confirm Password validation
// Required field, must match password.
export function validateConfirmPassword(
    password: string | undefined,
    confirmPassword: string | undefined,
): string | null {
    if (!confirmPassword) {
        return 'Please confirm your password.';
    }
    if (password !== confirmPassword) {
        return 'Passwords do not match.';
    }
    return null;
}

// 13. Registration: Account Type validation
// Required field.
export function validateAccountType(
    value: string | null | undefined,
): string | null {
    if (!value) {
        return 'Please select an account type to continue.';
    }
    return null;
}

// Registration Step 2: Validate Company Information fields
export function validateCompanyInfo(info: {
    companyName: string;
    phoneNumber: string;
    email: string;
    companyType: string[];
    companyDescription?: string;
    address?: string;
    website?: string;
}): Record<string, string> {
    const errors: Record<string, string> = {};

    const nameErr = validateCompanyName(info.companyName);
    if (nameErr) errors.companyName = nameErr;

    const phoneErr = validatePhone(info.phoneNumber);
    if (phoneErr) errors.phoneNumber = phoneErr;

    const emailErr = validateContactEmail(info.email);
    if (emailErr) errors.email = emailErr;

    const typeErr = validateCompanyType(info.companyType);
    if (typeErr) errors.companyType = typeErr;

    const webErr = validateWebsite(info.website);
    if (webErr) errors.website = webErr;

    const descErr = validateCompanyDescription(info.companyDescription);
    if (descErr) errors.companyDescription = descErr;

    const addrErr = validateLocation(info.address);
    if (addrErr) errors.address = addrErr;

    return errors;
}

// Registration Step 3: Validate Account Information fields
export function validateAccountInfo(info: {
    username: string;
    password: string;
    confirmPassword: string;
}): Record<string, string> {
    const errors: Record<string, string> = {};

    const userErr = validateUsername(info.username);
    if (userErr) errors.username = userErr;

    const passErr = validatePassword(info.password);
    if (passErr) errors.password = passErr;

    const confirmErr = validateConfirmPassword(
        info.password,
        info.confirmPassword,
    );
    if (confirmErr) errors.confirmPassword = confirmErr;

    return errors;
}
