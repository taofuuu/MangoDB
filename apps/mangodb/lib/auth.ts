const TOKEN_KEY = 'mangodb.token';

// The access token lives in localStorage. Every read is guarded because these
// pages render on the server first, where there is no window to read from.
export function getToken(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }
    return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.setItem(TOKEN_KEY, token);
}

// Forgetting the token is not the same as ending the session: the token stays
// signed and valid until it expires. Only POST /auth/logout revokes it.
export function clearToken(): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.removeItem(TOKEN_KEY);
}
