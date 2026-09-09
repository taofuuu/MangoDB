import type {
    ChangeCredentialsRequest,
    ChangeCredentialsResponse,
    CompanyProfile,
    UpdateCompanyProfileRequest,
} from '@mangodb/shared';
import { apiFetch } from './api';
import { setToken } from './auth';

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
// revokes the token the change was made with, so the response carries its
// replacement. Storing it happens here rather than at the call site: forget it
// once and a successful save signs the user out.
export async function changeMyCredentials(
    body: ChangeCredentialsRequest,
): Promise<CompanyProfile> {
    const { company, accessToken } = await apiFetch<ChangeCredentialsResponse>(
        '/companies/me/credentials',
        { method: 'PATCH', body: JSON.stringify(body) },
    );

    setToken(accessToken);
    return company;
}
