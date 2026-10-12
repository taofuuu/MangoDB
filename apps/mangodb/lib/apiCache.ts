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
// account must not see the last one's /companies/me or /proposals/mine. Both,
// and registration, also tell the other tabs to clear (clearCacheInEveryTab).

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
    const entry: Entry = { promise, savedAt: Date.now(), maxAgeMs };
    cache.set(key, entry);

    // written under time-crunch bypass — review later
    // The age check above only stops an old entry from being used; it never
    // removes one. Search keys are new for every keyword, page and filter, so
    // without this the Map would grow for as long as the tab stays open. The
    // identity check keeps the timer from deleting a newer entry for the key.
    setTimeout(() => {
        if (cache.get(key) === entry) {
            cache.delete(key);
        }
    }, maxAgeMs);

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

// written under time-crunch bypass — review later
// How many entries are held. Only the tests read it: it is the one way to see
// that an expired entry was removed, not just skipped.
export function cacheSize(): number {
    return cache.size;
}

// written under time-crunch bypass — review later
// The session cookie is shared by every tab, but each tab has its own cache.
// When one tab logs in, registers, or ends the session, the others must not
// keep answering from what the previous account was allowed to read (an
// admin-only /admin/companies/:id, say). BroadcastChannel reaches every other
// tab of this origin and carries no data, unlike localStorage, which would
// leave session state on disk. Only in a browser: on the Next server there are
// no tabs.
export const CACHE_CHANNEL_NAME = 'mangodb-api-cache';

const channel =
    typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel(CACHE_CHANNEL_NAME)
        : null;

channel?.addEventListener('message', () => {
    clearCache();
});

// A channel never receives its own messages, so this tab clears directly.
export function clearCacheInEveryTab(): void {
    clearCache();
    channel?.postMessage('clear');
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
