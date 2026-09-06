// 'both' mirrors account_type BOTH: one company that offers and requests work.
// What a role is allowed to do is a separate question — see auth/roles.ts.
export type UserRole = 'provider' | 'receiver' | 'both' | 'admin';

// Stored in company.account_type, uppercase as the seeded rows have it. There
// is no ADMIN account type: admins have no table yet (US6-1).
export type AccountType = 'PROVIDER' | 'RECEIVER' | 'BOTH';

export interface User {
    id: string;
    role: UserRole;
    email: string;
    // TODO: add more fields
}

// Claims the caller supplies when issuing an access token at login.
export interface AuthTokenPayload {
    sub: string;
    role: UserRole;
}

// What a verified token carries back. jti identifies the individual token so
// logout can revoke it; exp bounds how long that revocation must be remembered.
export interface AuthTokenClaims extends AuthTokenPayload {
    jti: string;
    exp: number;
}

// The frontend switches on these; a rename is a breaking change for both sides.
export type ApiErrorCode =
    | 'BAD_REQUEST'
    | 'VALIDATION_FAILED'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'INTERNAL';

// One per bad field, so a form can show each message beside its own input.
export interface ApiErrorDetail {
    field: string;
    message: string;
}

// Body of every non-2xx response. Success responses return the resource itself.
export interface ApiErrorResponse {
    error: {
        code: ApiErrorCode;
        message: string;
        details?: ApiErrorDetail[];
    };
}

// What registration accepts. The zod schema in the controller is the runtime
// source of truth; this is the same contract for the frontend.
export interface RegisterRequest {
    company_name: string;
    username: string;
    email: string;
    password: string;
    phone: string;
    account_type: AccountType;
    company_type: string[];
    company_description?: string;
    address?: string;
    website?: string;
}

// A company as the API returns it — never carries the password hash.
// company_type is flattened from its join table to plain tags.
export interface CompanyProfile {
    company_id: number;
    company_name: string;
    company_description: string | null;
    username: string;
    // Signs the company in, and is unique.
    email: string;
    // Shown on the profile so others can make contact. Not unique, and null
    // until the company fills it in — registration does not ask for one.
    contact_email: string | null;
    phone: string;
    address: string | null;
    website: string | null;
    account_type: AccountType;
    company_type: string[];
    // Both live on the provider table, flattened to here. A RECEIVER company
    // owns no provider row, so it always reads null for these two.
    service_term: string | null;
    warranty_policy: string | null;
}

// Registration returns two things, so it is the one response that wraps.
export interface RegisterResponse {
    company: CompanyProfile;
    accessToken: string;
}

// US1-5. What a profile edit accepts: an absent field means "leave it", and
// null clears a column that allows it. password is not editable here — that
// needs the current password — and neither is account_type, which decides
// which subtype rows a company owns.
export interface UpdateCompanyProfileRequest {
    company_name?: string;
    username?: string;
    email?: string;
    contact_email?: string | null;
    phone?: string;
    company_type?: string[];
    company_description?: string | null;
    address?: string | null;
    website?: string | null;
    // Provider-only. Sending either as a RECEIVER company is a 403.
    service_term?: string | null;
    warranty_policy?: string | null;
}
