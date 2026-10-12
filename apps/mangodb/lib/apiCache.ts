// In-memory cache for GET requests. The lib/* helpers wrap their reads in
// cachedGet, so a page you just saw, or one that another component on the same
// screen already asked for, skips the round trip to the API.
//
// The key is the request path, which already holds everything that changes the
// answer: ids, page, pageSize, search and filters. It stores the Promise, not
// the data, so two callers asking while the first request is still loading
// share it instead of starting a second one.
//
// Writes clear what they change through invalidateAfter, so a save is visible
// on the next read. The max age is for changes made by someone else, which this
// tab cannot know about.
//
// It lives at module level, so it survives client-side navigation. Logout
// clears it with the full page load in redirectToLogin; login clears it in
// lib/session.ts, because router.push('/') keeps the module alive and the next
// account must not see the last one's /companies/me or /proposals/mine.

export const API_CACHE_MAX_AGE_MS = 30_000;

type Entry = {
    promise: Promise<unknown>;
    savedAt: number;
    maxAgeMs: number;
};

const cache = new Map<string, Entry>();

export function cachedGet<T>(
    key: string,
    load: () => Promise<T>,
    maxAgeMs: number = API_CACHE_MAX_AGE_MS,
): Promise<T> {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.savedAt < hit.maxAgeMs) {
        return hit.promise as Promise<T>;
    }

    const promise = load();
    cache.set(key, { promise, savedAt: Date.now(), maxAgeMs });

    // A failed request is not an answer worth keeping: drop it, so Retry
    // really retries. The identity check stops this from deleting a newer
    // entry that replaced this one in the meantime.
    promise.catch(() => {
        if (cache.get(key)?.promise === promise) {
            cache.delete(key);
        }
    });

    return promise;
}

// Drops every entry whose key starts with one of `prefixes`, e.g.
// '/certificates'. A prefix also matches longer paths: '/job-postings' drops
// '/job-postings/mine?page=1' too.
export function invalidateCache(...prefixes: string[]): void {
    for (const key of cache.keys()) {
        if (prefixes.some((prefix) => key.startsWith(prefix))) {
            cache.delete(key);
        }
    }
}

export function clearCache(): void {
    cache.clear();
}

// Wraps a write. Clears once it settles, success or failure: a failed request
// may still have changed something on the server (a timeout after the commit),
// and a refetch is cheap next to showing stale data. finally runs before the
// caller's await resumes, so a reload right after the save misses the cache.
// No prefixes means the write can show up anywhere, so everything goes.
export function invalidateAfter<T>(
    write: Promise<T>,
    ...prefixes: string[]
): Promise<T> {
    return write.finally(() => {
        if (prefixes.length === 0) {
            clearCache();
        } else {
            invalidateCache(...prefixes);
        }
    });
}
