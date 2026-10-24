// Field names are camelCase, here and everywhere above the database. See
// docs/conventions.md section 1. Every union below is derived from a const
// array, so the frontend can loop over the values (section 6).

// A page of a list: GET endpoints that page answer with this (section 3).
export interface Paginated<T> {
    items: T[];
    pagination: PaginationMeta;
}

// 'both' mirrors accountType BOTH: one company that offers and requests work.
// What a role is allowed to do is a separate question — see auth/roles.ts.
export const USER_ROLES = ['provider', 'receiver', 'both', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Stored in company.account_type, uppercase as the seeded rows have it. ADMIN
// is deliberately absent from registerSchema, so the public signup form can
// never mint one. An admin is a company row with accountType ADMIN and no
// provider or receiver row — there is no separate admin table.
export const ACCOUNT_TYPES = ['PROVIDER', 'RECEIVER', 'BOTH', 'ADMIN'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

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

// The free-text status columns, pinned to a closed set. All are VarChar(50) in
// the database with nothing enforcing them, so these types are the
// enforcement — see docs/conventions.md section 6. The label a user reads
// ("Open for Proposals") is the frontend's; the column stores the value here.
export const LISTING_STATUSES = ['OPEN', 'CLOSED'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];
export const PROPOSAL_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
// ADR 0015, in the order a project moves through them. Only the moves the ADR
// lists are allowed; the last two are final.
export const PROJECT_STATUSES = [
    'AWAITING_QUOTATION',
    'AWAITING_DEPOSIT',
    'IN_PROGRESS',
    'AWAITING_ACCEPTANCE',
    'COMPLETED',
    'CANCELLED',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
// ADR 0017. Only one quotation per project is PENDING at a time.
export const QUOTATION_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED'] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

// project_update.update_type: a Provider's progress note (US4-10), or the
// Receiver's reason for rejecting the work (US4-12).
export const PROJECT_UPDATE_TYPES = ['PROGRESS', 'WORK_REJECTED'] as const;
export type ProjectUpdateType = (typeof PROJECT_UPDATE_TYPES)[number];

// listing.listing_type: which kind of listing a row is (section 7, ADR 0020).
export const LISTING_TYPES = ['SERVICE', 'JOB'] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

// Ordering choices of the service search. Never stored, so camelCase like
// COMPANY_SORT_ORDERS (section 6).
export const SERVICE_SORT_ORDERS = [
    'newest',
    'priceAsc',
    'priceDesc',
    'ratingDesc',
    'ratingAsc',
] as const;
export type ServiceSortOrder = (typeof SERVICE_SORT_ORDERS)[number];

// The frontend switches on these; a rename is a breaking change for both sides.
export const API_ERROR_CODES = [
    'BAD_REQUEST',
    'VALIDATION_FAILED',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'CONFLICT',
    'TOO_MANY_REQUESTS',
    'INTERNAL',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

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

// GET /companies/:companyId. What one company sees of another: the profile
// without the two fields it signs in with. contactEmail is the address meant
// for other companies.
export type PublicCompanyProfile = Omit<CompanyProfile, 'username' | 'email'>;

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

// US3-6. One company search result card. The full public profile is fetched
// only when its detail panel opens. categories and techStack are every one
// used by the company's services (ADR 0009: tech stack is per service).
export interface CompanySummary {
    companyId: number;
    companyName: string;
    companyDescription: string | null;
    companyPhoto: string | null;
    accountType: AccountType;
    contactEmail: string | null;
    phone: string;
    website: string | null;
    categories: string[];
    techStack: string[];
}

export const COMPANY_SORT_ORDERS = ['nameAsc', 'nameDesc'] as const;
export type CompanySortOrder = (typeof COMPANY_SORT_ORDERS)[number];

// US3-1, US3-3. One service search result card: the service, with a short
// profile of the company that offers it (ADR 0001) and its Provider rating
// summary (T3.3.2). techStack is this service's own.
export interface ServiceSummary extends ReviewSummary {
    serviceId: number;
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number | null;
    categories: string[];
    techStack: string[];
    company: CompanyBrief;
}

// T3.2.2. Values the service-search filter controls can offer. Categories are
// the fixed catalog; techStack contains names currently used by searchable
// services (ADR 0009 keeps that vocabulary open-ended).
export interface ServiceFilterOptions {
    categories: string[];
    techStack: string[];
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

// A service as POST /services, GET /services/mine and GET /services/:serviceId
// return it. serviceId is the row's listing_id, named for the resource the way
// a job's is jobId. company is the Provider that offers it.
export interface Service {
    serviceId: number;
    company: CompanyBrief;
    type: 'SERVICE';
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number | null;
    listingStatus: ListingStatus;
    categoryIds: number[];
    techStack: string[];
}

// A work sample on a service. portfolioId is a surrogate key: the table used
// to be identified by (listing_id, portfolio_link), which left no way to name
// a row in a URL. The pair is still unique — see @@unique in the schema.
export interface ServicePortfolio {
    portfolioId: number;
    serviceId: number;
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

// US2-6. A Receiver's job. jobId matches listing.listingId. company is the
// Receiver that posted it.
export interface Job {
    jobId: number;
    company: CompanyBrief;
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

// What POST /jobs accepts. Validated by createJobSchema.
export interface CreateJobRequest {
    listingTitle: string;
    listingDesc: string;
    minBudget?: number | null | undefined;
    maxBudget: number;
    locationPref?: string | null | undefined;
    duration?: string | null | undefined;
    deadline?: string | null | undefined;
    categoryIds?: number[] | undefined;
}

// What POST /services accepts. Validated by createServiceSchema. A new
// service always starts OPEN, so there is no listingStatus here.
export interface CreateServiceRequest {
    listingTitle: string;
    listingDesc: string;
    minBudget?: number | null | undefined;
    maxBudget?: number | undefined;
    categoryIds?: number[] | undefined;
    techStack?: string[] | undefined;
}

// What PATCH /services/:serviceId accepts. Send only what changed;
// categoryIds and techStack each replace the whole set.
export interface UpdateServiceRequest {
    listingTitle?: string | undefined;
    listingDesc?: string | undefined;
    minBudget?: number | null | undefined;
    maxBudget?: number | null | undefined;
    categoryIds?: number[] | undefined;
    techStack?: string[] | undefined;
}

// What PATCH /jobs/:jobId accepts. Send only what changed; categoryIds
// replaces the whole set. Validated by updateJobSchema.
export interface UpdateJobRequest {
    listingTitle?: string | undefined;
    listingDesc?: string | undefined;
    minBudget?: number | null | undefined;
    maxBudget?: number | undefined;
    locationPref?: string | null | undefined;
    duration?: string | null | undefined;
    deadline?: string | null | undefined;
    categoryIds?: number[] | undefined;
}

// US2-8. A proposal sent to a listing (ADR 0021). Today every listing it is
// sent to is a job; the names say sender and listing so a hire request on a
// service can use the same row.
export interface Proposal {
    proposalId: number;
    listingId: number;
    senderId: number;
    proposalBudget: number;
    proposalTerms: string;
    duration: number;
    proposalStatus: ProposalStatus;
    createdAt: string;
}

// US2-9. One row of GET /proposals/mine, as the sender sees it: the proposal,
// with the listing's title, its kind (JOB or SERVICE), and the company it was
// sent to, so the list needs no extra request per row.
export interface SentProposal extends Proposal {
    listingTitle: string;
    listingType: ListingType;
    recipient: CompanyBrief;
    // The project accepting it started; null until then.
    projectId: number | null;
}

// US2-9. GET /proposals/mine/counts: how many proposals the caller has sent,
// in total and by status. Its own endpoint so the list stays paginated
// (conventions §3) and the page's chips stay put while the list is filtered.
export type ProposalStatusCounts = { total: number } & Record<
    Lowercase<ProposalStatus>,
    number
>;

// A company in one line: enough to show who it is beside something it sent
// or owns, with no second request.
export interface CompanyBrief {
    companyId: number;
    companyName: string;
    companyPhoto: string | null;
}

// US2-10. One row of GET /jobs/:jobId/proposals, as the listing's owner sees
// it: the proposal, with a short profile of the company that sent it, so the
// owner can choose.
export interface ReceivedProposal extends Proposal {
    sender: CompanyBrief;
}

// What POST /jobs/:jobId/proposals accepts.
export interface CreateProposalRequest {
    proposalBudget: number;
    proposalTerms: string;
    duration: number;
}

// A project as accepting a proposal creates it (POST /proposals/:proposalId/accept).
// The other project responses below build on it.
export interface Project {
    projectId: number;
    proposalId: number;
    totalBudget: number;
    // YYYY-MM-DD date string per conventions section 10
    startDate: string;
    projectStatus: ProjectStatus;
    // ISO timestamps, null until the step happens (US4-6, US4-7, US4-13)
    depositReportedAt: string | null;
    depositConfirmedAt: string | null;
    completedAt: string | null;
}

// Which side of a project the signed-in company is on. A BOTH account can be
// either, so it is worked out per project, never from accountType.
export type ProjectRole = Extract<UserRole, 'provider' | 'receiver'>;

// US4-9. One row of GET /projects/mine.
export interface ProjectSummary extends Project {
    listingTitle: string;
    myRole: ProjectRole;
    // The company on the other side. Kept when its account is deleted:
    // a project is history (see Company.deletedAt).
    otherParty: CompanyBrief;
}

// US4-9. GET /projects/:projectId, for its two parties only.
export interface ProjectDetail extends Project {
    listingId: number;
    listingType: ListingType;
    listingTitle: string;
    provider: CompanyBrief;
    receiver: CompanyBrief;
    myRole: ProjectRole;
}

// US2-5. One row of GET /companies/:companyId/completed-projects.
export interface CompletedProject {
    projectId: number;
    listingTitle: string;
    receiver: CompanyBrief;
    completedAt: string;
}

// ADR 0017. A quotation PDF on a project. Sent as multipart (a `file` field),
// so it has no JSON request type.
export interface Quotation {
    quotationId: number;
    projectId: number;
    // Public URL of the PDF
    quotationFile: string;
    quotationStatus: QuotationStatus;
    createdAt: string;
}

// ADR 0017. One notice in the navbar bell's popup: a PENDING quotation on a
// project where you are the Receiver. Nothing is stored for it; it leaves the
// list once you accept or reject the quotation.
export interface QuotationNotice {
    quotationId: number;
    projectId: number;
    listingTitle: string;
    // The Provider that sent the quotation
    provider: CompanyBrief;
    createdAt: string;
}

// US4-9. One entry of GET /projects/:projectId/updates, oldest first.
export interface ProjectUpdate {
    projectUpdateId: number;
    projectId: number;
    updateType: ProjectUpdateType;
    updateText: string;
    createdAt: string;
}

// What POST /projects/:projectId/updates accepts (US4-10).
export interface CreateProjectUpdateRequest {
    updateText: string;
}

// What POST /projects/:projectId/reject-work accepts (US4-12). The reason is
// saved as a WORK_REJECTED update.
export interface RejectWorkRequest {
    reason: string;
}

// ADR 0018. The Receiver's review of a completed project. Each score is 1-5.
export interface Review {
    reviewId: number;
    projectId: number;
    workQualityScore: number;
    // How the Provider dealt with the Receiver, not a service listing
    serviceScore: number;
    valueForMoneyScore: number;
    deliveryTimeScore: number;
    comment: string | null;
    createdAt: string;
}

// US5-3. One row of GET /companies/:companyId/reviews: the review and the
// Receiver that wrote it.
export interface CompanyReview extends Review {
    receiver: CompanyBrief;
}

// US5-3. GET /companies/:companyId/reviews/summary. The same two fields the
// admin company types carry, so one helper fills both (T5.1.3).
export interface ReviewSummary {
    averageRating: number | null;
    ratingCount: number;
}

// What POST /projects/:projectId/review accepts (US5-1, US5-2). The comment
// is optional, up to 500 characters.
export interface CreateReviewRequest {
    workQualityScore: number;
    serviceScore: number;
    valueForMoneyScore: number;
    deliveryTimeScore: number;
    comment?: string | null | undefined;
}

// GET /categories. The fixed catalog a listing picks from (ADR 0002).
export interface Category {
    categoryId: number;
    categoryName: string;
}
