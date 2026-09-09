import type {
    ChangeCredentialsRequest,
    ChangeCredentialsResponse,
    CompanyProfile,
    UpdateCompanyProfileRequest,
} from '@mangodb/shared';
import { apiFetch } from './api';

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
