import type { CompanyProfile, SessionResponse } from '@mangodb/shared';
import { apiFetch } from './api';

// US1-2. Nothing to store: the API sets the session cookie on the response and
// the browser carries it from here on. This just reports who signed in.
export async function login(
    email: string,
    password: string,
): Promise<CompanyProfile> {
    const { company } = await apiFetch<SessionResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    return company;
}
