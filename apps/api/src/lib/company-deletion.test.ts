/*
 * Tests for lib/company-deletion.ts:
 * - softDeleteCompany, the one write both delete paths (the company's own
 *   delete and the admin delete) go through.
 * - isSessionEnded, requireAuth's check on the company row.
 *
 * What they cover:
 * - Deleting a company rejects the pending proposals and hire requests it
 *   sent (#262), so nobody can accept one and open a project with an account
 *   that can never sign in again. The listing owners get no notice.
 * - Deleting a company rejects the pending proposals and hire requests on its
 *   listings, and each sender gets a PROPOSAL_REJECTED notice (#263), so they
 *   do not wait on Pending forever.
 * - Decided (accepted or rejected) proposals and other companies' proposals
 *   are left alone.
 * - A company that is already deleted, or an administrator, matches nothing,
 *   so no proposal changes.
 * - A missing or soft-deleted company ends the session.
 * - A token issued before the last credential change ends; one issued in the
 *   same second as the change (the replacement token) or later survives.
 * - A company that never changed its credentials keeps every token.
 *
 * How:
 * - lib/prisma is replaced with mock.module, so nothing reaches the database.
 *   The fake keeps proposals in an array and answers the proposal updates by
 *   reading `senderId`, `listing.companyId` and `proposalStatus` from the where.
 *
 * Run: npm test (in apps/api).
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

type Row = { deletedAt: Date | null; credentialsChangedAt: Date | null };

// A proposal with the owner of the listing it was sent to.
type ProposalRow = {
    proposalId: number;
    senderId: number;
    listingOwnerId: number;
    proposalStatus: string;
};

type ProposalUpdateArgs = {
    where: {
        senderId?: number;
        listing?: { companyId: number };
        proposalStatus: string;
    };
    data: { proposalStatus: string };
};

let row: Row | null;
// How many company rows the soft-delete update matches: 0 for a company that
// is already deleted, or an administrator.
let deleteMatches: number;
let proposals: ProposalRow[];
let notices: Record<string, unknown>[];

function updateProposals(args: ProposalUpdateArgs): ProposalRow[] {
    const { senderId, listing, proposalStatus } = args.where;
    const hits = proposals.filter(
        (p) =>
            p.proposalStatus === proposalStatus &&
            (senderId === undefined || p.senderId === senderId) &&
            (listing === undefined || p.listingOwnerId === listing.companyId),
    );
    for (const p of hits) p.proposalStatus = args.data.proposalStatus;
    return hits;
}

const fakePrisma = {
    // The callback form only, given the same client. No rollback.
    $transaction: (work: (tx: unknown) => Promise<unknown>) => work(fakePrisma),
    company: {
        findUnique: () => Promise.resolve(row),
        updateMany: () => Promise.resolve({ count: deleteMatches }),
    },
    proposal: {
        updateMany: async (args: ProposalUpdateArgs) => ({
            count: updateProposals(args).length,
        }),
        updateManyAndReturn: async (args: ProposalUpdateArgs) =>
            updateProposals(args).map((p) => ({
                proposalId: p.proposalId,
                senderId: p.senderId,
            })),
    },
    notification: {
        createMany: async (args: { data: Record<string, unknown>[] }) => {
            notices.push(...args.data);
            return { count: args.data.length };
        },
    },
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

const DELETED = 5;
const OTHER = 7;
const THIRD = 9;

beforeEach(() => {
    deleteMatches = 1;
    notices = [];
    proposals = [
        // Sent by the deleted company.
        {
            proposalId: 1,
            senderId: DELETED,
            listingOwnerId: OTHER,
            proposalStatus: 'PENDING',
        },
        {
            proposalId: 2,
            senderId: DELETED,
            listingOwnerId: OTHER,
            proposalStatus: 'ACCEPTED',
        },
        // Sent to the deleted company's listings.
        {
            proposalId: 3,
            senderId: OTHER,
            listingOwnerId: DELETED,
            proposalStatus: 'PENDING',
        },
        {
            proposalId: 4,
            senderId: THIRD,
            listingOwnerId: DELETED,
            proposalStatus: 'PENDING',
        },
        {
            proposalId: 5,
            senderId: THIRD,
            listingOwnerId: DELETED,
            proposalStatus: 'REJECTED',
        },
        // Nothing to do with the deleted company.
        {
            proposalId: 6,
            senderId: THIRD,
            listingOwnerId: OTHER,
            proposalStatus: 'PENDING',
        },
    ];
});

function statuses(): string[] {
    return proposals.map((p) => p.proposalStatus);
}

describe('softDeleteCompany', () => {
    it('rejects the pending proposals it sent and the ones on its listings', async () => {
        assert.equal(await softDeleteCompany(DELETED), true);
        assert.deepEqual(statuses(), [
            'REJECTED',
            'ACCEPTED',
            'REJECTED',
            'REJECTED',
            'REJECTED',
            'PENDING',
        ]);
    });

    it('tells each sender on its listings, and nobody about its own', async () => {
        await softDeleteCompany(DELETED);
        assert.deepEqual(notices, [
            {
                proposalId: 3,
                senderId: DELETED,
                recipientId: OTHER,
                notificationType: 'PROPOSAL_REJECTED',
            },
            {
                proposalId: 4,
                senderId: DELETED,
                recipientId: THIRD,
                notificationType: 'PROPOSAL_REJECTED',
            },
        ]);
    });

    it('changes no proposal when the company matches nothing', async () => {
        deleteMatches = 0;
        assert.equal(await softDeleteCompany(DELETED), false);
        assert.deepEqual(statuses(), [
            'PENDING',
            'ACCEPTED',
            'PENDING',
            'PENDING',
            'REJECTED',
            'PENDING',
        ]);
        assert.deepEqual(notices, []);
    });
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
