import type {
    AccountType,
    CompanyAccountDetail,
    CompanyAccountListResponse,
    CompanyListResponse,
    PublicCompanyProfile,
    CompanySortOrder,
    ChangeCredentialsRequest,
    ChangeCredentialsResponse,
    CompanyProfile,
    DeleteCompanyAccountRequest,
    UpdateCompanyProfileRequest,
} from '@mangodb/shared';
import { apiFetch } from './api';
import { cachedGet, invalidateAfter } from './apiCache';

// Every write in this file clears the whole cache, not one prefix: a company's
// name and photo are copied into service cards, job postings and the admin
// list, and deleting a company hides its listings everywhere. These writes are
// rare, so a full refetch costs little.

// The API's ids are int4, so anything else could never name a company. Caught
// here rather than sent, because the API answers a malformed id with 400, and
// to the reader "/profile/abc" is just as much a company that is not there.
const MAX_INT4 = 2_147_483_647;

// The [companyId] segment of /profile/[companyId] and the pages under it.
export function parseCompanyId(
    raw: string | string[] | undefined,
): number | null {
    if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return null;

    const id = Number(raw);
    return id >= 1 && id <= MAX_INT4 ? id : null;
}

export interface GetCompanyAccountsOptions {
    q?: string | undefined;
    filter?: AccountType | undefined;
    includeDeleted?: boolean | undefined;
}

export function getMyProfile(): Promise<CompanyProfile> {
    const path = '/companies/me';
    return cachedGet(path, () => apiFetch<CompanyProfile>(path));
}

export function updateMyProfile(
    body: UpdateCompanyProfileRequest,
): Promise<CompanyProfile> {
    return invalidateAfter(
        apiFetch<CompanyProfile>('/companies/me', {
            method: 'PATCH',
            body: JSON.stringify(body),
        }),
    );
}

// US1-5, the photo half. Its own request because PATCH /companies/me is JSON
// and a file cannot travel in one. Answers with the whole profile, so the page
// re-renders from this rather than guessing what was stored.
export function updateMyPhoto(photo: File): Promise<CompanyProfile> {
    const body = new FormData();
    body.append('photo', photo);

    return invalidateAfter(
        apiFetch<CompanyProfile>('/companies/me/photo', {
            method: 'PATCH',
            body,
        }),
    );
}

// Clearing it needs its own method for the same reason: a multipart body has
// no way to say "no photo" that is not just a forgotten attachment.
export function deleteMyPhoto(): Promise<CompanyProfile> {
    return invalidateAfter(
        apiFetch<CompanyProfile>('/companies/me/photo', {
            method: 'DELETE',
        }),
    );
}

export function listCompanyAccounts(
    page: number,
    pageSize: number,
    options?: GetCompanyAccountsOptions,
): Promise<CompanyAccountListResponse> {
    const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });

    if (options?.q?.trim()) {
        query.set('q', options.q.trim());
    }
    if (options?.filter) {
        query.set('filter', options.filter);
    }
    if (options?.includeDeleted !== undefined) {
        query.set('includeDeleted', String(options.includeDeleted));
    }

    const path = `/admin/companies?${query.toString()}`;
    return cachedGet(path, () => apiFetch<CompanyAccountListResponse>(path));
}

export function getCompanyAccountDetail(
    companyId: number,
): Promise<CompanyAccountDetail> {
    const path = `/admin/companies/${companyId}`;
    return cachedGet(path, () => apiFetch<CompanyAccountDetail>(path));
}

// US3-6. Company discovery is intentionally separate from the administrator
// account list: this response contains only public card data, and the endpoint
// accepts only keyword search, name ordering, and pagination.
export function listCompanies(
    page: number,
    pageSize: number,
    q?: string,
    orderBy: CompanySortOrder = 'nameAsc',
): Promise<CompanyListResponse> {
    const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        orderBy,
    });

    if (q?.trim()) {
        query.set('q', q.trim());
    }

    return apiFetch<CompanyListResponse>(`/companies?${query.toString()}`);
}

export function getCompanyProfile(
    companyId: number,
): Promise<PublicCompanyProfile> {
    return apiFetch<PublicCompanyProfile>(`/companies/${companyId}`);
}

export function updateCompanyAccount(
    companyId: number,
    body: UpdateCompanyProfileRequest,
): Promise<CompanyAccountDetail> {
    return invalidateAfter(
        apiFetch<CompanyAccountDetail>(`/admin/companies/${companyId}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        }),
    );
}

// US6-4. 204 on success, so apiFetch resolves with undefined — nothing to
// return. A wrong password is a 401, which surfaces as an ApiRequestError
// for the confirm modal to catch and show inline.
export function deleteCompanyAccount(
    companyId: number,
    body: DeleteCompanyAccountRequest,
): Promise<void> {
    return invalidateAfter(
        apiFetch<void>(`/admin/companies/${companyId}`, {
            method: 'DELETE',
            body: JSON.stringify(body),
        }),
    );
}

// Username, email, and password, each gated on the current password. The server
// revokes the token the change was made with and sets a replacement cookie on
// the same response, so a successful save keeps the session rather than ending
// it — nothing to hold on to here.
export async function changeMyCredentials(
    body: ChangeCredentialsRequest,
): Promise<CompanyProfile> {
    const { company } = await invalidateAfter(
        apiFetch<ChangeCredentialsResponse>('/companies/me/credentials', {
            method: 'PATCH',
            body: JSON.stringify(body),
        }),
    );

    return company;
}

// US1-6. 204 on success, so apiFetch resolves with undefined. If the company
// has an ongoing project, the API responds with 409 Conflict, which surfaces
// as an ApiRequestError for the confirm modal to catch and show inline.
export function deleteMyAccount(): Promise<void> {
    return invalidateAfter(
        apiFetch<void>('/companies/me', {
            method: 'DELETE',
        }),
    );
}
