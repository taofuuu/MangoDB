// Field names are camelCase, here and everywhere above the database. See
// docs/conventions.md section 1.

// 'both' mirrors accountType BOTH: one company that offers and requests work.
// What a role is allowed to do is a separate question — see auth/roles.ts.
export type UserRole = 'provider' | 'receiver' | 'both' | 'admin';

// Stored in company.account_type, uppercase as the seeded rows have it. ADMIN
// is deliberately absent from registerSchema, so the public signup form can
// never mint one. An admin is a company row with accountType ADMIN and no
// provider or receiver row — there is no separate admin table.
export type AccountType = 'PROVIDER' | 'RECEIVER' | 'BOTH' | 'ADMIN';

// What a signup may ask for. Narrower than AccountType on purpose:
// registerSchema rejects ADMIN at runtime, so the contract the frontend
// codes against should reject it at compile time too.
export type RegisterAccountType = Exclude<AccountType, 'ADMIN'>;

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

// The three free-text status columns, pinned to a closed set. All three are
// VarChar(50) in the database with nothing enforcing them, so these types are
// the enforcement — see docs/conventions.md section 6. The label a user reads
// ("Open for Proposals") is the frontend's; the column stores the value here.
export const LISTING_STATUSES = ['DRAFT', 'OPEN', 'CLOSED'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];
export const PROPOSAL_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

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
    companyName: string;
    username: string;
    email: string;
    password: string;
    phone: string;
    accountType: RegisterAccountType;
    companyType: string[];
    companyDescription?: string | undefined;
    address?: string | undefined;
    website?: string | undefined;
    // The ToS consent checkbox. Required: true stores the consent time, and
    // anything else is rejected with a 400.
    tosAccepted: true;
}

// A company as the API returns it — never carries the password hash.
// companyType is flattened from its join table to plain tags.
export interface CompanyProfile {
    companyId: number;
    companyName: string;
    companyDescription: string | null;
    username: string;
    // Signs the company in, and is unique.
    email: string;
    // Shown on the profile so others can make contact. Not unique, and null
    // until the company fills it in — registration does not ask for one.
    contactEmail: string | null;
    phone: string;
    address: string | null;
    website: string | null;
    // Public URL of the uploaded photo, or null until one is set. Written by
    // PATCH /companies/me/photo rather than the profile edit, because a file
    // cannot travel in that endpoint's JSON body.
    companyPhoto: string | null;
    accountType: AccountType;
    companyType: string[];
    // Both live on the provider table, flattened to here. A RECEIVER company
    // owns no provider row, so it always reads null for these two.
    serviceTerm: string | null;
    warrantyPolicy: string | null;
}

// US6-2. The administrator list deliberately carries less than a full profile:
// enough to render each card, but no sign-in email or address until a specific
// account is opened. Password is never part of either admin response.
export interface CompanyAccountSummary {
    companyId: number;
    companyName: string;
    companyDescription: string | null;
    phone: string;
    accountType: AccountType;
    averageRating: number | null;
    ratingCount: number;
    deletedAt: string | null;
}

// The detail endpoint is admin-only, so it may include the private contact
// fields already exposed by CompanyProfile along with the list's rating data.
export interface CompanyAccountDetail extends CompanyProfile {
    averageRating: number | null;
    ratingCount: number;
    deletedAt: string | null;
}

export interface PaginationMeta {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface CompanyAccountListResponse {
    items: CompanyAccountSummary[];
    pagination: PaginationMeta;
}

// US3-6. One company search result card. categories and techStack are every
// one used by the company's services (ADR 0009: tech stack is per service).
export interface CompanySummary {
    companyId: number;
    companyName: string;
    companyDescription: string | null;
    companyPhoto: string | null;
    accountType: AccountType;
    categories: string[];
    techStack: string[];
}

export interface CompanyListResponse {
    items: CompanySummary[];
    pagination: PaginationMeta;
}

// US3-1. One service search result card: the service, with a short profile of
// the company that offers it (ADR 0001). techStack is this service's own.
export interface ServiceSummary {
    listingId: number;
    listingTitle: string;
    minBudget: number | null;
    maxBudget: number | null;
    categories: string[];
    techStack: string[];
    company: CompanyBrief;
}

export interface ServiceListResponse {
    items: ServiceSummary[];
    pagination: PaginationMeta;
}

// A company and a token to act as it. Register, login, and a credential change
// all answer with this pair, so it is named once rather than three times.
export interface SessionResponse {
    company: CompanyProfile;
    accessToken: string;
}

// US1-5. What a profile edit accepts: an absent field means "leave it", and
// null clears a column that allows it. The three fields a company signs in with
// are not here — changing any of them needs the current password, so they have
// their own endpoint — and neither is accountType, which decides which subtype
// rows a company owns.
export interface UpdateCompanyProfileRequest {
    companyName?: string | undefined;
    contactEmail?: string | null | undefined;
    phone?: string | undefined;
    companyType?: string[] | undefined;
    companyDescription?: string | null | undefined;
    address?: string | null | undefined;
    website?: string | null | undefined;
    // Provider-only. Sending either as a RECEIVER company is a 403.
    serviceTerm?: string | null | undefined;
    warrantyPolicy?: string | null | undefined;
}

// What a company signs in with, all three behind one gate: the current password
// is required whatever you change, because each of these is a way to take the
// account over. An absent field is left alone, and none of them is nullable, so
// there are two states here rather than the profile edit's three.
export interface ChangeCredentialsRequest {
    currentPassword: string;
    username?: string | undefined;
    email?: string | undefined;
    newPassword?: string | undefined;
}

// US6-4. The admin's own password, confirming intent before an irreversible
// delete of another company's account. Same currentPassword shape as
// ChangeCredentialsRequest, checked against the admin's own row.
export interface DeleteCompanyAccountRequest {
    currentPassword: string;
}

// Wraps, like register: the token the change was made with is revoked, so the
// response has to carry the one that replaces it.
export type ChangeCredentialsResponse = SessionResponse;

// What POST /auth/check-availability answers. The username and email come back
// normalized — trimmed and lowercased — because that is the form the uniqueness
// check actually ran against.
export interface IdentityAvailability {
    username: string;
    email: string;
    usernameAvailable: boolean;
    emailAvailable: boolean;
}

// A work sample on a listing. portfolioId is a surrogate key: the table used
// to be identified by (listingId, portfolioLink), which left no way to name
// a row in a URL. The pair is still unique — see @@unique in the schema.
export interface ServicePortfolio {
    portfolioId: number;
    listingId: number;
    portfolioName: string;
    // Nullable: not every work sample has write-up text yet.
    portfolioDescription: string | null;
    // ISO date string (YYYY-MM-DD) — a date column, per conventions section 10.
    developmentDate: string;
    portfolioImage: string;
    portfolioLink: string;
}

// A provider's certificate. There was no shared type for this, so the frontend
// invented three incompatible shapes for the same rows.
export interface Certificate {
    certificateId: number;
    certTitle: string;
    organization: string;
    certImage: string | null;
    credentialId: string | null;
    credentialUrl: string | null;
    issueMonth: number | null;
    issueYear: number | null;
    expireMonth: number | null;
    expireYear: number | null;
}

// US2-6. A Receiver's job posting. jobPostingId matches listing.listingId.
export interface JobPosting {
    jobPostingId: number;
    companyId: number;
    companyName: string;
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number | null;
    listingStatus: ListingStatus;
    locationPref: string | null;
    duration: string | null;
    // YYYY-MM-DD date string per conventions section 10
    deadline: string | null;
    categoryIds: number[];
    categories: string[];
    createdAt?: string | undefined;
}

export interface JobPostingListResponse {
    items: JobPosting[];
    pagination: PaginationMeta;
}

// What POST /job-postings accepts. Validated by createJobPostingSchema.
export interface CreateJobPostingRequest {
    listingTitle: string;
    listingDesc: string;
    minBudget?: number | null | undefined;
    maxBudget: number;
    locationPref?: string | null | undefined;
    duration?: string | null | undefined;
    deadline?: string | null | undefined;
    categoryIds?: number[] | undefined;
}

// What PATCH /job-postings/:jobPostingId accepts. Send only what changed;
// categoryIds replaces the whole set. Validated by updateJobPostingSchema.
export interface UpdateJobPostingRequest {
    listingTitle?: string | undefined;
    listingDesc?: string | undefined;
    minBudget?: number | null | undefined;
    maxBudget?: number | undefined;
    locationPref?: string | null | undefined;
    duration?: string | null | undefined;
    deadline?: string | null | undefined;
    categoryIds?: number[] | undefined;
}

// US2-8. A Provider's proposal on a job posting.
export interface Proposal {
    proposalId: number;
    jobPostingId: number;
    providerId: number;
    proposalBudget: number;
    proposalTerms: string;
    duration: number;
    proposalStatus: ProposalStatus;
    createdAt: string;
}

// US2-9. Paginated proposals response for provider tracking.
export interface ProposalListResponse {
    items: Proposal[];
    pagination: PaginationMeta;
}

// A company in one line: enough to show who it is beside something it sent
// or owns, with no second request.
export interface CompanyBrief {
    companyId: number;
    companyName: string;
    companyPhoto: string | null;
}

// US2-10. One row of GET /job-postings/:jobPostingId/proposals: the proposal,
// with a short profile of the Provider that sent it so the Receiver can choose.
export interface PostingProposal extends Proposal {
    provider: CompanyBrief;
}

// What POST /job-postings/:jobPostingId/proposals accepts.
export interface CreateProposalRequest {
    proposalBudget: number;
    proposalTerms: string;
    duration: number;
}

// The Project created when a proposal is accepted (POST /proposals/:proposalId/accept).
export interface Project {
    projId: number;
    proposalId: number;
    totalBudget: number;
    // YYYY-MM-DD date string per conventions section 10
    startDate: string;
    status: ProjectStatus;
}
