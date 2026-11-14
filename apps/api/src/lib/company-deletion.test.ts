/*
 * Tests for lib/company-deletion.ts: softDeleteCompany, and isSessionEnded
 * (requireAuth's check on the company row).
 *
 * What they cover:
 * - Deleting a company rejects the pending proposals on its listings, with a
 *   notice to each sender (#263). A second delete touches nothing.
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
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

type Row = { deletedAt: Date | null; credentialsChangedAt: Date | null };

let row: Row | null;

// softDeleteCompany's rows: how many companies the update matched, the
// company's listings with a pending proposal, and what got written.
let deletedCount: number;
let pendingListings: { listingId: number }[];
let rejectedOn: number[];
let notices: unknown[];
let listingWhere: unknown;

// The delete's writes go through tx only, so a stray prisma call fails.
const fakeTx = {
    company: {
        updateMany: () => Promise.resolve({ count: deletedCount }),
    },
    listing: {
        findMany: (args: { where: unknown }) => {
            listingWhere = args.where;
            return Promise.resolve(pendingListings);
        },
    },
    proposal: {
        updateManyAndReturn: (args: { where: { listingId: number } }) => {
            rejectedOn.push(args.where.listingId);
            return Promise.resolve([
                { proposalId: args.where.listingId * 10, senderId: 7 },
            ]);
        },
    },
    notification: {
        createMany: (args: { data: unknown[] }) => {
            notices.push(...args.data);
            return Promise.resolve({ count: args.data.length });
        },
    },
};

const fakePrisma = {
    company: { findUnique: () => Promise.resolve(row) },
    $transaction: (work: (tx: unknown) => Promise<unknown>) => work(fakeTx),
};

let isSessionEnded: typeof import('./company-deletion.js').isSessionEnded;
let softDeleteCompany: typeof import('./company-deletion.js').softDeleteCompany;

before(async () => {
    mock.module(pathToFileURL(require.resolve('./prisma')).href, {
        namedExports: { prisma: fakePrisma },
    });
    ({ isSessionEnded, softDeleteCompany } =
        await import('./company-deletion.js'));
});

// 2026-11-03T12:00:00.700Z, so its whole second is 12:00:00.
const CHANGED_AT = new Date('2026-11-03T12:00:00.700Z');
const CHANGED_SECOND = Math.floor(CHANGED_AT.getTime() / 1000);

describe('softDeleteCompany', () => {
    beforeEach(() => {
        rejectedOn = [];
        notices = [];
    });

    it('rejects the pending proposals on its listings, with notices', async () => {
        deletedCount = 1;
        pendingListings = [{ listingId: 3 }, { listingId: 4 }];

        assert.equal(await softDeleteCompany(5), true);
        // Only this company's listings, and only those with a pending one.
        assert.deepEqual(listingWhere, {
            companyId: 5,
            proposal: { some: { proposalStatus: 'PENDING' } },
        });
        assert.deepEqual(rejectedOn, [3, 4]);
        assert.deepEqual(notices, [
            {
                proposalId: 30,
                senderId: 5,
                recipientId: 7,
                notificationType: 'PROPOSAL_REJECTED',
            },
            {
                proposalId: 40,
                senderId: 5,
                recipientId: 7,
                notificationType: 'PROPOSAL_REJECTED',
            },
        ]);
    });

    it('touches no proposal when the company was already gone', async () => {
        deletedCount = 0;
        pendingListings = [{ listingId: 3 }];

        assert.equal(await softDeleteCompany(5), false);
        assert.deepEqual(rejectedOn, []);
        assert.deepEqual(notices, []);
    });
});

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
