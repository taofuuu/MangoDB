/*
 * Tests for isSessionEnded (lib/company-deletion.ts), requireAuth's check on
 * the company row.
 *
 * What they cover:
 * - A missing or soft-deleted company ends the session.
 * - A token issued before the last credential change ends; one issued in the
 *   same second as the change (the replacement token) or later survives.
 * - A company that never changed its credentials keeps every token.
 *
 * How:
 * - lib/prisma is replaced with mock.module, so nothing reaches the database.
 *
 * Run: npm test (in apps/api).
 */
import { before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

type Row = { deletedAt: Date | null; credentialsChangedAt: Date | null };

let row: Row | null;

const fakePrisma = {
    company: { findUnique: () => Promise.resolve(row) },
};

let isSessionEnded: typeof import('./company-deletion.js').isSessionEnded;

before(async () => {
    mock.module(pathToFileURL(require.resolve('./prisma')).href, {
        namedExports: { prisma: fakePrisma },
    });
    ({ isSessionEnded } = await import('./company-deletion.js'));
});

// 2026-11-03T12:00:00.700Z, so its whole second is 12:00:00.
const CHANGED_AT = new Date('2026-11-03T12:00:00.700Z');
const CHANGED_SECOND = Math.floor(CHANGED_AT.getTime() / 1000);

describe('isSessionEnded', () => {
    it('ends the session of a missing company', async () => {
        row = null;
        assert.equal(await isSessionEnded(1, CHANGED_SECOND), true);
    });

    it('ends the session of a deleted company', async () => {
        row = { deletedAt: new Date(), credentialsChangedAt: null };
        assert.equal(await isSessionEnded(1, CHANGED_SECOND), true);
    });

    it('keeps every token when credentials never changed', async () => {
        row = { deletedAt: null, credentialsChangedAt: null };
        assert.equal(await isSessionEnded(1, 0), false);
    });

    it('ends a token issued before the change', async () => {
        row = { deletedAt: null, credentialsChangedAt: CHANGED_AT };
        assert.equal(await isSessionEnded(1, CHANGED_SECOND - 1), true);
    });

    it('keeps the token issued in the same second as the change', async () => {
        row = { deletedAt: null, credentialsChangedAt: CHANGED_AT };
        assert.equal(await isSessionEnded(1, CHANGED_SECOND), false);
        assert.equal(await isSessionEnded(1, CHANGED_SECOND + 60), false);
    });
});
