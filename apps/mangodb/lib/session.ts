import type { CompanyProfile, SessionResponse } from '@mangodb/shared';
import { apiFetch } from './api';

// Nothing to store: both login endpoints set the session cookie on the
// response, and the browser carries it from here on. This just reports who
// signed in.
async function authenticate(
    path: '/auth/login' | '/auth/admin/login',
    email: string,
    password: string,
): Promise<CompanyProfile> {
    const { company } = await apiFetch<SessionResponse>(path, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    return company;
}

export function login(
    email: string,
    password: string,
): Promise<CompanyProfile> {
    return authenticate('/auth/login', email, password);
}

// The API verifies both the credentials and the administrator role before it
// creates the session cookie. A client-side role check would not be security.
export function adminLogin(
    email: string,
    password: string,
): Promise<CompanyProfile> {
    return authenticate('/auth/admin/login', email, password);
}
