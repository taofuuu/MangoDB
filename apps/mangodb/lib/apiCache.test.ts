/*
 * Tests for lib/apiCache.ts, the in-memory cache behind the lib/* GET helpers
 * (profile, proposals, certificates, portfolios, job and service lists).
 *
 * What they cover, and why each matters:
 * - Same key twice → one network call. That's the whole point of the cache.
 * - Two calls while the first is still loading → still one call. The cache
 *   stores the Promise, not the data, so two components mounting at once
 *   (e.g. a page and its form both asking for /companies/me) share a request.
 * - Different keys → separate calls. Page 2 must not get page 1's answer.
 * - After the max age the entry is stale → loads again, so another user's
 *   changes show up. A per-call max age overrides the default.
 * - After the max age the entry is also removed, not just skipped. Search
 *   keys differ for every keyword and page, so without this the cache would
 *   grow for as long as the tab is open. The timer must not remove a newer
 *   entry that replaced the old one.
 * - A failed load is not kept → Retry really retries.
 * - invalidateCache(prefix) drops only matching keys; clearCache drops all.
 * - invalidateAfter clears once the write settles, success or failure, and
 *   before the caller's await continues — so a reload right after a save
 *   reads fresh data.
 *
 * `load` is a fake that counts calls, standing in for apiFetch. Time (Date and
 * setTimeout) is faked with mock.timers so nothing waits for real, and so the
 * eviction timers cannot keep the test process alive.
 *
 * The cross-tab clearing is tested in apiCache.crossTab.test.ts.
 *
 * Run: npm test -w apps/mangodb
 */
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
    API_CACHE_MAX_AGE_MS,
    cacheSize,
    cachedGet,
    clearCache,
    invalidateAfter,
    invalidateCache,
} from './apiCache';

function countingLoad<T>(value: T) {
    return mock.fn(async () => value);
}

beforeEach(() => {
    clearCache();
    mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1_000_000 });
});

afterEach(() => {
    mock.timers.reset();
});

describe('cachedGet', () => {
    it('loads once for the same key', async () => {
        const load = countingLoad('me');

        assert.equal(await cachedGet('/companies/me', load), 'me');
        assert.equal(await cachedGet('/companies/me', load), 'me');
        assert.equal(load.mock.callCount(), 1);
    });

    it('shares a request that is still loading', async () => {
        let resolve!: (value: string) => void;
        const load = mock.fn(() => new Promise<string>((r) => (resolve = r)));

        const first = cachedGet('/proposals/mine?page=1', load);
        const second = cachedGet('/proposals/mine?page=1', load);
        resolve('page 1');

        assert.equal(await first, 'page 1');
        assert.equal(await second, 'page 1');
        assert.equal(load.mock.callCount(), 1);
    });

    it('loads separately for different keys', async () => {
        const one = countingLoad('page 1');
        const two = countingLoad('page 2');

        assert.equal(await cachedGet('/services?page=1', one), 'page 1');
        assert.equal(await cachedGet('/services?page=2', two), 'page 2');
        assert.equal(one.mock.callCount(), 1);
        assert.equal(two.mock.callCount(), 1);
    });

    it('loads again once the entry is older than the max age', async () => {
        const load = countingLoad('me');

        await cachedGet('/companies/me', load);
        mock.timers.tick(API_CACHE_MAX_AGE_MS - 1);
        await cachedGet('/companies/me', load);
        assert.equal(load.mock.callCount(), 1);

        mock.timers.tick(1);
        await cachedGet('/companies/me', load);
        assert.equal(load.mock.callCount(), 2);
    });

    it('honours a per-call max age', async () => {
        const load = countingLoad('options');
        const fiveMinutes = 5 * 60_000;

        await cachedGet('/services/filter-options', load, fiveMinutes);
        mock.timers.tick(API_CACHE_MAX_AGE_MS);
        await cachedGet('/services/filter-options', load, fiveMinutes);
        assert.equal(load.mock.callCount(), 1);

        mock.timers.tick(fiveMinutes);
        await cachedGet('/services/filter-options', load, fiveMinutes);
        assert.equal(load.mock.callCount(), 2);
    });

    it('does not keep a failed load', async () => {
        const failing = mock.fn(async () => {
            throw new Error('offline');
        });
        const working = countingLoad('me');

        await assert.rejects(cachedGet('/companies/me', failing), /offline/);
        assert.equal(await cachedGet('/companies/me', working), 'me');
        assert.equal(working.mock.callCount(), 1);
    });
});

describe('eviction', () => {
    it('removes an entry once it is older than the max age', async () => {
        await cachedGet('/services?q=react&page=1', countingLoad('react'));
        await cachedGet('/services?q=vue&page=1', countingLoad('vue'));
        assert.equal(cacheSize(), 2);

        mock.timers.tick(API_CACHE_MAX_AGE_MS - 1);
        assert.equal(cacheSize(), 2);

        mock.timers.tick(1);
        assert.equal(cacheSize(), 0);
    });

    it('uses the per-call max age', async () => {
        const fiveMinutes = 5 * 60_000;
        await cachedGet(
            '/services/filter-options',
            countingLoad('options'),
            fiveMinutes,
        );

        mock.timers.tick(API_CACHE_MAX_AGE_MS);
        assert.equal(cacheSize(), 1);

        mock.timers.tick(fiveMinutes - API_CACHE_MAX_AGE_MS);
        assert.equal(cacheSize(), 0);
    });

    it("an old entry's timer does not remove the entry that replaced it", async () => {
        const load = countingLoad('me');

        await cachedGet('/companies/me', load);
        invalidateCache('/companies/me');
        mock.timers.tick(10);
        await cachedGet('/companies/me', load);

        // The first entry's timer fires here; the second has 10ms left.
        mock.timers.tick(API_CACHE_MAX_AGE_MS - 10);
        assert.equal(cacheSize(), 1);

        await cachedGet('/companies/me', load);
        assert.equal(load.mock.callCount(), 2);
    });
});

describe('invalidateCache / clearCache', () => {
    it('drops only keys that start with the prefix', async () => {
        const certs = countingLoad('certs');
        const me = countingLoad('me');

        await cachedGet('/certificates/mine', certs);
        await cachedGet('/companies/me', me);

        invalidateCache('/certificates');

        await cachedGet('/certificates/mine', certs);
        await cachedGet('/companies/me', me);
        assert.equal(certs.mock.callCount(), 2);
        assert.equal(me.mock.callCount(), 1);
    });

    it('accepts several prefixes at once', async () => {
        const services = countingLoad('services');
        const portfolios = countingLoad('portfolios');

        await cachedGet('/services?page=1', services);
        await cachedGet('/portfolios?listingId=3', portfolios);

        invalidateCache('/services', '/portfolios');

        await cachedGet('/services?page=1', services);
        await cachedGet('/portfolios?listingId=3', portfolios);
        assert.equal(services.mock.callCount(), 2);
        assert.equal(portfolios.mock.callCount(), 2);
    });

    it('clearCache drops everything', async () => {
        const me = countingLoad('me');
        const jobs = countingLoad('jobs');

        await cachedGet('/companies/me', me);
        await cachedGet('/job-postings?page=1', jobs);

        clearCache();

        await cachedGet('/companies/me', me);
        await cachedGet('/job-postings?page=1', jobs);
        assert.equal(me.mock.callCount(), 2);
        assert.equal(jobs.mock.callCount(), 2);
    });
});

describe('invalidateAfter', () => {
    it('clears the prefix before the caller continues after a save', async () => {
        const certs = countingLoad('certs');
        await cachedGet('/certificates/mine', certs);

        const saved = await invalidateAfter(
            Promise.resolve('new cert'),
            '/certificates',
        );

        assert.equal(saved, 'new cert');
        await cachedGet('/certificates/mine', certs);
        assert.equal(certs.mock.callCount(), 2);
    });

    it('clears even when the write fails, and still rejects', async () => {
        const certs = countingLoad('certs');
        await cachedGet('/certificates/mine', certs);

        await assert.rejects(
            invalidateAfter(Promise.reject(new Error('409')), '/certificates'),
            /409/,
        );

        await cachedGet('/certificates/mine', certs);
        assert.equal(certs.mock.callCount(), 2);
    });

    it('with no prefix, clears everything', async () => {
        const me = countingLoad('me');
        const jobs = countingLoad('jobs');
        await cachedGet('/companies/me', me);
        await cachedGet('/job-postings?page=1', jobs);

        await invalidateAfter(Promise.resolve(undefined));

        await cachedGet('/companies/me', me);
        await cachedGet('/job-postings?page=1', jobs);
        assert.equal(me.mock.callCount(), 2);
        assert.equal(jobs.mock.callCount(), 2);
    });
});
