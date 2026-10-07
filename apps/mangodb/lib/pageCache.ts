// written under time-crunch bypass — review later
//
// In-memory cache for list pages (job search, my jobs, services search).
// Going back to a page you just saw, or forward to one that was prefetched,
// skips the ~300-400ms API call.
//
// The key is the request path, which already holds everything that changes
// the answer: page, pageSize, search and filters. It stores the Promise, not
// the data, so a click on Next while that page's prefetch is still loading
// waits for the same request instead of starting a second one.
//
// It lives at module level, so it survives leaving the page and coming back.
// Logout clears it, because redirectToLogin does a full page load. Login does
// not: the API shows each company a different list, so if one account signs
// in right after another without a reload, it can see the other's cached
// pages until they expire.

export const PAGE_CACHE_MAX_AGE_MS = 30_000;

// How many pages after the current one prefetchPages loads by default.
export const PREFETCH_PAGES = 2;

type Entry = {
    promise: Promise<unknown>;
    savedAt: number;
};

const cache = new Map<string, Entry>();

export function cachedGet<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.savedAt < PAGE_CACHE_MAX_AGE_MS) {
        return hit.promise as Promise<T>;
    }

    const promise = load();
    cache.set(key, { promise, savedAt: Date.now() });

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

// Starts loading the `count` pages after `currentPage`, but never past
// `totalPages`. Nobody waits for these, so a failure is silently ignored;
// if that page is opened later, it is just loaded normally.
export function prefetchPages(
    currentPage: number,
    totalPages: number,
    loadPage: (page: number) => Promise<unknown>,
    count = PREFETCH_PAGES,
): void {
    const lastPage = Math.min(totalPages, currentPage + count);
    for (let page = currentPage + 1; page <= lastPage; page++) {
        loadPage(page).catch(() => {});
    }
}

// Drops every entry whose key starts with `prefix`, e.g. '/job-postings'.
export function clearPageCache(prefix: string): void {
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) {
            cache.delete(key);
        }
    }
}
