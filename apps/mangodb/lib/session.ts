import { ApiRequestError, apiFetch } from './api';
import { clearToken } from './auth';

// US1-3. POST /auth/logout puts the token's jti on the server's denylist —
// that, not clearing storage, is what ends the session. So the local token is
// dropped only after the server has confirmed the revoke.
export async function logout(): Promise<void> {
    try {
        await apiFetch<void>('/auth/logout', { method: 'POST' });
    } catch (err) {
        // 401 means the token was already expired or revoked: the session is
        // over either way and there is nothing to retry. Any other failure
        // leaves the token valid on the server, so rethrow rather than let the
        // UI claim a session ended that did not.
        if (!(err instanceof ApiRequestError) || err.status !== 401) {
            throw err;
        }
    }

    clearToken();
}
