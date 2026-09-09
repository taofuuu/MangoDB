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

// US6-2. The administrator list deliberately carries less than a full profile:
// enough to render each card, but no sign-in email or address until a specific
// account is opened. Password is never part of either admin response.
export interface CompanyAccountSummary {
    company_id: number;
    company_name: string;
    company_description: string | null;
    phone: string;
    account_type: AccountType;
    average_rating: number | null;
    rating_count: number;
}

// The detail endpoint is admin-only, so it may include the private contact
// fields already exposed by CompanyProfile along with the list's rating data.
export interface CompanyAccountDetail extends CompanyProfile {
    average_rating: number | null;
    rating_count: number;
}

export interface PaginationMeta {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
}

export interface CompanyAccountListResponse {
    items: CompanyAccountSummary[];
    pagination: PaginationMeta;
}

export interface SessionResponse {
    company: CompanyProfile;
    accessToken: string;
}

// Registration returns two things, so it is one of the two responses that wrap.
export type RegisterResponse = SessionResponse;

// US1-5. What a profile edit accepts: an absent field means "leave it", and
// null clears a column that allows it. The three fields a company signs in with
// are not here — changing any of them needs the current password, so they have
// their own endpoint — and neither is account_type, which decides which subtype
// rows a company owns.
export interface UpdateCompanyProfileRequest {
    company_name?: string;
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

// What a company signs in with, all three behind one gate: the current password
// is required whatever you change, because each of these is a way to take the
// account over. An absent field is left alone, and none of them is nullable, so
// there are two states here rather than the profile edit's three.
export interface ChangeCredentialsRequest {
    current_password: string;
    username?: string;
    email?: string;
    new_password?: string;
}

// Wraps, like register: the token the change was made with is revoked, so the
// response has to carry the one that replaces it.
export type ChangeCredentialsResponse = SessionResponse;

// A work sample on a listing. portfolio_id is a surrogate key: the table used
// to be identified by (listing_id, portfolio_link), which left no way to name
// a row in a URL. The pair is still unique — see @@unique in the schema.
export interface ServicePortfolio {
    portfolio_id: number;
    listing_id: number;
    portfolio_name: string;
    // Nullable: not every work sample has write-up text yet.
    portfolio_description: string | null;
    // ISO date string (YYYY-MM-DD) — how res.json() serializes a Prisma
    // DateTime, and all this column ever stores is a date, no time-of-day.
    development_date: string;
    portfolio_image: string;
    portfolio_link: string;
}
