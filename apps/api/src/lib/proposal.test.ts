/*
 * Tests for the US2-9 helpers in lib/proposal.ts (the Provider's "Your
 * Proposals" page).
 *
 * toSentProposal, one row of GET /proposals/mine:
 * - Each proposal carries the listing's owner as `recipient` (id, name,
 *   photo), so the page can show who it went to with no extra request per row.
 * - A listing with no owner is a broken row, so it is a 500 rather than a
 *   blank recipient.
 * - The proposal's own fields keep the shared wire shape: Decimal becomes a
 *   number, Date becomes an ISO string, listingId and senderId keep their names
 *   (ADR 0021).
 *
 * toProposalStatusCounts, the body of GET /proposals/mine/counts:
 * - groupBy leaves out a status with no rows, so each status must start at 0.
 * - total is the sum of all groups.
 *
 * How:
 * - toSentProposal is a pure function, so the test feeds it a fake row.
 * - lib/prisma is replaced with mock.module before lib/proposal loads. Loading
 *   the real one would build a Prisma client against the shared database.
 *
 * Run: npm test (in apps/api). Needs --experimental-test-module-mocks, which the
 * test script passes.
 */
import { before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { Prisma } from '../generated/prisma/client';
import { ApiError } from './api-error';

function moduleUrl(specifier: string): string {
    return pathToFileURL(require.resolve(specifier)).href;
}

let lib: typeof import('./proposal.js');

before(async () => {
    mock.module(moduleUrl('./prisma'), {
        namedExports: { prisma: {} },
    });
    lib = await import('./proposal.js');
});

type Row = Parameters<typeof lib.toSentProposal>[0];

function makeRow(
    company: Row['listing']['company'],
    listingType: string = 'JOB',
): Row {
    return {
        proposalId: 7,
        listingId: 42,
        senderId: 3,
        proposalBudget: new Prisma.Decimal('15000.50'),
        proposalTerms: 'Two rounds of changes',
        duration: new Prisma.Decimal(14),
        proposalStatus: 'PENDING',
        createdAt: new Date('2026-10-01T08:30:00.000Z'),
        listing: { listingTitle: 'Build a landing page', listingType, company },
    };
}

describe('toSentProposal', () => {
    it('adds the listing owner as recipient and includes listingType', () => {
        const result = lib.toSentProposal(
            makeRow({
                companyId: 9,
                companyName: 'Mango Co',
                companyPhoto: 'https://example.com/m.png',
            }),
        );

        assert.deepEqual(result.recipient, {
            companyId: 9,
            companyName: 'Mango Co',
            companyPhoto: 'https://example.com/m.png',
        });
        assert.equal(result.listingTitle, 'Build a landing page');
        assert.equal(result.listingType, 'JOB');
    });

    it('sets listingType to SERVICE on a service hire request', () => {
        const result = lib.toSentProposal(
            makeRow(
                {
                    companyId: 9,
                    companyName: 'Mango Co',
                    companyPhoto: null,
                },
                'SERVICE',
            ),
        );

        assert.equal(result.listingType, 'SERVICE');
    });

    // No listing lacks an owner, and nothing creates one without, so a
    // missing owner is a broken row: a 500, not a blank recipient.
    it('is a 500 when the listing has no owner', () => {
        assert.throws(
            () => lib.toSentProposal(makeRow(null)),
            (err: unknown) => err instanceof ApiError && err.status === 500,
        );
    });

    it('keeps the proposal fields in the wire shape', () => {
        const result = lib.toSentProposal(
            makeRow({
                companyId: 9,
                companyName: 'Mango Co',
                companyPhoto: null,
            }),
        );

        assert.equal(result.listingId, 42);
        assert.equal(result.proposalBudget, 15000.5);
        assert.equal(result.duration, 14);
        assert.equal(result.createdAt, '2026-10-01T08:30:00.000Z');
    });
});

describe('toProposalStatusCounts', () => {
    it('fills a status with no proposals with 0', () => {
        const result = lib.toProposalStatusCounts([
            { proposalStatus: 'PENDING', _count: { _all: 4 } },
        ]);

        assert.deepEqual(result, {
            total: 4,
            pending: 4,
            accepted: 0,
            rejected: 0,
        });
    });

    it('adds every group into total', () => {
        const result = lib.toProposalStatusCounts([
            { proposalStatus: 'PENDING', _count: { _all: 5 } },
            { proposalStatus: 'ACCEPTED', _count: { _all: 3 } },
            { proposalStatus: 'REJECTED', _count: { _all: 2 } },
        ]);

        assert.deepEqual(result, {
            total: 10,
            pending: 5,
            accepted: 3,
            rejected: 2,
        });
    });

    it('gives all zeros for a Provider with no proposals', () => {
        assert.deepEqual(lib.toProposalStatusCounts([]), {
            total: 0,
            pending: 0,
            accepted: 0,
            rejected: 0,
        });
    });
});
