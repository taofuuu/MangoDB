import { prisma } from '../lib/prisma';

// A logged-out token stays cryptographically valid until it expires, so
// requireAuth rejects any jti listed in public.revoked_token. Stored in
// Postgres so it survives a restart — which is why both functions are async.

function nowInSeconds(): number {
    return Math.floor(Date.now() / 1000);
}

function toDate(unixSeconds: number): Date {
    return new Date(unixSeconds * 1000);
}

// On logout only. Revocations are rare, authenticated requests are not.
async function pruneExpired(now: number): Promise<void> {
    await prisma.revoked_token.deleteMany({
        where: { expires_at: { lte: toDate(now) } },
    });
}

export async function revokeToken(jti: string, exp: number): Promise<void> {
    const now = nowInSeconds();
    // verifyAccessToken rejects it anyway.
    if (exp <= now) {
        return;
    }

    await pruneExpired(now);

    // upsert: two logouts can race the same token, and that is not an error.
    const expiresAt = toDate(exp);
    await prisma.revoked_token.upsert({
        where: { jti },
        create: { jti, expires_at: expiresAt },
        update: { expires_at: expiresAt },
    });
}

export async function isTokenRevoked(jti: string): Promise<boolean> {
    const revoked = await prisma.revoked_token.findUnique({ where: { jti } });
    if (!revoked) {
        return false;
    }
    // An expired row is dead weight, not a revocation. pruneExpired clears it.
    return revoked.expires_at.getTime() > Date.now();
}

// Test hook: start from a clean denylist.
export async function clearRevokedTokens(): Promise<void> {
    await prisma.revoked_token.deleteMany({});
}
