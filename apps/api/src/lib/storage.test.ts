/*
 * Tests for signStorageUrls (lib/storage.ts), the private-bucket link swap.
 *
 * What they cover:
 * - A stored URL from the bucket comes back as its signed link, in order.
 * - A URL that is not ours (seed data) comes back unchanged and is not sent
 *   to Supabase; with none of ours, Supabase is not called at all.
 * - A Supabase failure, returned or thrown, is logged and the stored URLs come
 *   back: the caller may have saved its row already, so it must not be a 500.
 *
 * How:
 * - env and @supabase/supabase-js are replaced with mock.module, so nothing
 *   needs app secrets or reaches Supabase.
 *
 * Run: npm test (in apps/api).
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const BASE = 'https://x.supabase.co/storage/v1/object/public/quotation/';

let signedPaths: string[][];
let signingFailure: 'returned' | 'thrown' | null;

const fakeClient = {
    storage: {
        from: () => ({
            createSignedUrls: async (paths: string[]) => {
                signedPaths.push(paths);
                if (signingFailure === 'thrown') throw new Error('boom');
                if (signingFailure === 'returned') {
                    return { data: null, error: { message: 'boom' } };
                }
                return {
                    data: paths.map((path) => ({
                        path,
                        signedUrl: `https://signed.test/${path}`,
                    })),
                    error: null,
                };
            },
        }),
    },
};

let signStorageUrls: typeof import('./storage.js').signStorageUrls;

before(async () => {
    mock.module(pathToFileURL(require.resolve('../env')).href, {
        namedExports: {
            supabaseCredentials: () => ({ url: 'u', key: 'k' }),
        },
    });
    mock.module(pathToFileURL(require.resolve('@supabase/supabase-js')).href, {
        namedExports: { createClient: () => fakeClient },
    });
    ({ signStorageUrls } = await import('./storage.js'));
});

beforeEach(() => {
    signedPaths = [];
    signingFailure = null;
});

describe('signStorageUrls', () => {
    it('swaps our URLs for signed links and leaves others alone', async () => {
        const links = await signStorageUrls(
            [`${BASE}quotations/a.pdf`, 'https://demo.local/q.pdf'],
            'quotation',
            60,
        );
        assert.deepEqual(links, [
            'https://signed.test/quotations/a.pdf',
            'https://demo.local/q.pdf',
        ]);
        assert.deepEqual(signedPaths, [['quotations/a.pdf']]);
    });

    it('does not call Supabase when no URL is ours', async () => {
        const links = await signStorageUrls(
            ['https://demo.local/q.pdf'],
            'quotation',
            60,
        );
        assert.deepEqual(links, ['https://demo.local/q.pdf']);
        assert.equal(signedPaths.length, 0);
    });

    for (const failure of ['returned', 'thrown'] as const) {
        it(`falls back to the stored URL on a ${failure} failure`, async (t) => {
            const log = t.mock.method(console, 'error', () => undefined);
            signingFailure = failure;
            const stored = [`${BASE}quotations/a.pdf`];

            assert.deepEqual(
                await signStorageUrls(stored, 'quotation', 60),
                stored,
            );
            assert.equal(log.mock.callCount(), 1);
        });
    }
});
