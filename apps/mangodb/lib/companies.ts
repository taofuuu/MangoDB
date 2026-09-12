import type {
    AccountType,
    CompanyAccountDetail,
    CompanyAccountListResponse,
    ChangeCredentialsRequest,
    ChangeCredentialsResponse,
    CompanyProfile,
    DeleteCompanyAccountRequest,
    UpdateCompanyProfileRequest,
} from '@mangodb/shared';
import { apiFetch } from './api';

export interface GetCompanyAccountsOptions {
    q?: string | undefined;
    filter?: AccountType | undefined;
    includeDeleted?: boolean | undefined;
}

export function getMyProfile(): Promise<CompanyProfile> {
    return apiFetch<CompanyProfile>('/companies/me');
}

export function updateMyProfile(
    body: UpdateCompanyProfileRequest,
): Promise<CompanyProfile> {
    return apiFetch<CompanyProfile>('/companies/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

export function getCompanyAccounts(
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

    return apiFetch<CompanyAccountListResponse>(
        `/admin/companies?${query.toString()}`,
    );
}

export function getCompanyAccountDetail(
    companyId: number,
): Promise<CompanyAccountDetail> {
    return apiFetch<CompanyAccountDetail>(`/admin/companies/${companyId}`);
}

export function updateCompanyAccount(
    companyId: number,
    body: UpdateCompanyProfileRequest,
): Promise<CompanyAccountDetail> {
    return apiFetch<CompanyAccountDetail>(`/admin/companies/${companyId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

// US6-4. 204 on success, so apiFetch resolves with undefined — nothing to
// return. A wrong password is a 401, which surfaces as an ApiRequestError
// for the confirm modal to catch and show inline.
export function deleteCompanyAccount(
    companyId: number,
    body: DeleteCompanyAccountRequest,
): Promise<void> {
    return apiFetch<void>(`/admin/companies/${companyId}`, {
        method: 'DELETE',
        body: JSON.stringify(body),
    });
}

// Username, email, and password, each gated on the current password. The server
// revokes the token the change was made with and sets a replacement cookie on
// the same response, so a successful save keeps the session rather than ending
// it — nothing to hold on to here.
export async function changeMyCredentials(
    body: ChangeCredentialsRequest,
): Promise<CompanyProfile> {
    const { company } = await apiFetch<ChangeCredentialsResponse>(
        '/companies/me/credentials',
        { method: 'PATCH', body: JSON.stringify(body) },
    );

    return company;
}
