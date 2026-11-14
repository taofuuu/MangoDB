/*
 * Tests for the cross-tab half of lib/apiCache.ts: clearCacheInEveryTab and
 * the BroadcastChannel listener.
 *
 * Why this matters: the session cookie is shared by every tab, but each tab
 * keeps its own cache. If tab A logs out and signs in as another company, tab B
 * must not keep answering from what the previous account could read.
 *
 * What they cover:
 * - A 'clear' message from another tab empties this tab's cache, so the next
 *   read goes to the API again.
 * - clearCacheInEveryTab empties this tab's cache directly (a channel never
 *   receives its own messages) and sends one message the other tabs receive.
 *
 * "Another tab" is a second BroadcastChannel on the same name: Node has
 * BroadcastChannel built in and delivers between instances the same way a
 * browser delivers between tabs. apiCache only opens its channel when `window`
 * exists, so the test defines one before importing the module — a static
 * import would run first, which is why this file uses a dynamic import and
 * lives apart from apiCache.test.ts.
 *
 * Run: npm test -w apps/mangodb
 */
import { after, before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

type ApiCache = typeof import('./apiCache');

let apiCache: ApiCache;
let otherTab: BroadcastChannel;

function nextMessage(channel: BroadcastChannel): Promise<unknown> {
    return new Promise((resolve) => {
        channel.addEventListener('message', (event) => resolve(event.data), {
            once: true,
        });
    });
}

// The message reaches the module's listener some time after postMessage, and
// later still on a busy machine, so a fixed wait failed now and then (#260).
// A channel skips its own posts, so there is no event to await: check every
// few ms until the cache is empty, and give up after a second so a listener
// that never runs still fails the test.
async function waitForEmptyCache(): Promise<void> {
    const giveUpAt = Date.now() + 1000;
    while (apiCache.cacheSize() > 0 && Date.now() < giveUpAt) {
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
}

before(async () => {
    Object.assign(globalThis, { window: globalThis });
    apiCache = await import('./apiCache');
    otherTab = new BroadcastChannel(apiCache.CACHE_CHANNEL_NAME);
});

after(() => {
    otherTab.close();
});

beforeEach(() => {
    apiCache.clearCache();
});

describe('cross-tab clearing', () => {
    it("another tab's message clears this tab's cache", async () => {
        const load = mock.fn(async () => 'admin-only company detail');

        await apiCache.cachedGet('/admin/companies/7', load);
        assert.equal(apiCache.cacheSize(), 1);

        otherTab.postMessage('clear');
        await waitForEmptyCache();

        assert.equal(apiCache.cacheSize(), 0);
        await apiCache.cachedGet('/admin/companies/7', load);
        assert.equal(load.mock.callCount(), 2);
    });

    it('clearCacheInEveryTab clears here and tells the other tabs', async () => {
        await apiCache.cachedGet('/companies/me', async () => 'me');
        const received = nextMessage(otherTab);

        apiCache.clearCacheInEveryTab();

        assert.equal(apiCache.cacheSize(), 0);
        assert.equal(await received, 'clear');
    });
});
