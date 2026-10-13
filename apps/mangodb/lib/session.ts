import type { CompanyProfile, SessionResponse } from '@mangodb/shared';
import { apiFetch, isNotSignedIn } from './api';

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
        if (!isNotSignedIn(err)) {
            throw err;
        }
    }
}

function replaceLocation(url: string): void {
    if (typeof window === 'undefined') return;

    window.addEventListener(
        'pageshow',
        (event) => {
            if (event.persisted) window.location.reload();
        },
        { once: true },
    );
    window.location.replace(url);
}

// A full page load clears everything this session left in memory. replace(),
// not href: after a push, the browser's back-forward cache can restore this
// signed-in page as it was. Chrome skips that cache for replace(), but no spec
// promises it, so reload if it comes back. once: true — this only needs to
// fire for the navigation this call is about to start, not linger for the rest
// of the page's life.
export function redirectToLogin(): void {
    replaceLocation('/login');
}

export function sanitizeReturnUrl(
    url: string | null | undefined,
): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (
        !trimmed.startsWith('/') ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('/\\')
    ) {
        return null;
    }
    if (/[\r\n\t]/.test(trimmed)) {
        return null;
    }
    const beforeHash = trimmed.split('#')[0] ?? '';
    const pathOnly = beforeHash.split('?')[0] ?? '';
    if (
        pathOnly === '/unauthorized' ||
        pathOnly === '/login' ||
        pathOnly === '/admin/login'
    ) {
        return null;
    }
    return trimmed;
}

export function buildUnauthorizedUrl(nextPath?: string): string {
    const params = new URLSearchParams();
    const current =
        nextPath ??
        (typeof window !== 'undefined'
            ? window.location.pathname + window.location.search
            : null);
    const safeNext = sanitizeReturnUrl(current);
    if (safeNext && safeNext !== '/') {
        params.set('next', safeNext);
    }

    const query = params.toString();
    return query ? `/unauthorized?${query}` : '/unauthorized';
}

export function redirectToUnauthorized(): void {
    replaceLocation(buildUnauthorizedUrl());
}
