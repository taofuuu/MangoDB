/*
 * Tests for signStorageUrls (lib/storage.ts), the private-bucket link swap.
 *
 * What they cover:
 * - A stored URL from the bucket comes back as its signed link, in order.
 * - A URL that is not ours (seed data) comes back unchanged and is not sent
 *   to Supabase; with none of ours, Supabase is not called at all.
 * - A Supabase failure is a 500 ApiError.
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
import { ApiError } from './api-error';

const BASE = 'https://x.supabase.co/storage/v1/object/public/quotation/';

let signedPaths: string[][];
let failSigning: boolean;

const fakeClient = {
    storage: {
        from: () => ({
            createSignedUrls: async (paths: string[]) => {
                signedPaths.push(paths);
                if (failSigning) {
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
    failSigning = false;
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

    it('is a 500 when Supabase cannot sign', async () => {
        failSigning = true;
        await assert.rejects(
            signStorageUrls([`${BASE}quotations/a.pdf`], 'quotation', 60),
            (err) => err instanceof ApiError && err.status === 500,
        );
    });
});
