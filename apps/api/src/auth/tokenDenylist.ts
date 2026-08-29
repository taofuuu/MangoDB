// Access tokens are stateless, so a logged-out token stays cryptographically
// valid until it expires. This denylist is what makes logout actually end a
// session: requireAuth rejects any token whose jti is listed here.
//
// Storage is in-process. That means the list is lost on restart and is not
// shared between API instances, so a logged-out token would be honoured again
// after a deploy. Acceptable while the API runs as a single dev process; move
// this to Postgres (or Redis) behind the same two functions once DATABASE_URL
// is wired up. Nothing outside this file depends on where the entries live.

// jti -> token exp, as a UNIX timestamp in seconds.
const revoked = new Map<string, number>();

function nowInSeconds(): number {
    return Math.floor(Date.now() / 1000);
}

// An entry is only useful until the token expires on its own, so drop the
// stale ones rather than growing the map for the life of the process.
function pruneExpired(now: number): void {
    for (const [jti, exp] of revoked) {
        if (exp <= now) {
            revoked.delete(jti);
        }
    }
}

export function revokeToken(jti: string, exp: number): void {
    const now = nowInSeconds();
    pruneExpired(now);
    // Already expired: verifyAccessToken rejects it anyway.
    if (exp <= now) {
        return;
    }
    revoked.set(jti, exp);
}

export function isTokenRevoked(jti: string): boolean {
    const exp = revoked.get(jti);
    if (exp === undefined) {
        return false;
    }
    if (exp <= nowInSeconds()) {
        revoked.delete(jti);
        return false;
    }
    return true;
}

// Test hook: lets a suite start from a clean denylist.
export function clearRevokedTokens(): void {
    revoked.clear();
}
