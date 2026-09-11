import type { CompanyProfile, SessionResponse } from '@mangodb/shared';
import { ApiRequestError, apiFetch } from './api';

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

// US1-3. POST /auth/logout puts the token's jti on the server's denylist and
// clears the session cookie on the same response. Both halves happen on the
// server: the cookie is httpOnly, so JS could not clear it even if it tried.
export async function logout(): Promise<void> {
    try {
        await apiFetch<void>('/auth/logout', { method: 'POST' });
    } catch (err) {
        // 401 means there was no live token to revoke — missing, expired, or
        // already revoked — so the session is over and there is nothing to
        // retry. Any other failure may leave the token valid on the server, so
        // rethrow rather than let the UI claim a session ended.
        if (!(err instanceof ApiRequestError) || err.status !== 401) {
            throw err;
        }
    }
}
