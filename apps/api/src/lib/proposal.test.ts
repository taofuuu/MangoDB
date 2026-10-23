/*
 * Tests for the US2-9 helpers in lib/proposal.ts (sent proposals and hire
 * requests for Providers and Receivers).
 *
 * toSentProposal, one row of GET /proposals/mine:
 * - Each proposal carries the listing's owner as `recipient` (id, name,
 *   photo), so the page can show who it went to with no extra request per row.
 * - On a Job proposal, recipient is the Receiver that posted the job.
 * - On a Service hire request, recipient is the Provider offering the service.
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

function makeJobProposalRow(company: Row['listing']['company']): Row {
    return {
        proposalId: 7,
        listingId: 42,
        senderId: 3,
        proposalBudget: new Prisma.Decimal('15000.50'),
        proposalTerms: 'Two rounds of changes',
        duration: new Prisma.Decimal(14),
        proposalStatus: 'PENDING',
        createdAt: new Date('2026-10-01T08:30:00.000Z'),
        listing: {
            listingTitle: 'Build a landing page',
            listingType: 'JOB',
            company,
        },
    };
}

function makeServiceHireRequestRow(company: Row['listing']['company']): Row {
    return {
        proposalId: 8,
        listingId: 101,
        senderId: 4,
        proposalBudget: new Prisma.Decimal('50000.00'),
        proposalTerms: 'Full-stack development for our platform',
        duration: new Prisma.Decimal(3),
        proposalStatus: 'PENDING',
        createdAt: new Date('2026-10-02T10:00:00.000Z'),
        listing: {
            listingTitle: 'Full-stack web development',
            listingType: 'SERVICE',
            company,
        },
    };
}

describe('toSentProposal', () => {
    it('maps a Provider proposal on a Job (recipient is the job owner)', () => {
        const result = lib.toSentProposal(
            makeJobProposalRow({
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

    it('maps a Receiver hire request on a Service (recipient is the service provider)', () => {
        const result = lib.toSentProposal(
            makeServiceHireRequestRow({
                companyId: 15,
                companyName: 'Pro Devs Studio',
                companyPhoto: 'https://example.com/p.png',
            }),
        );

        assert.deepEqual(result.recipient, {
            companyId: 15,
            companyName: 'Pro Devs Studio',
            companyPhoto: 'https://example.com/p.png',
        });
        assert.equal(result.listingTitle, 'Full-stack web development');
        assert.equal(result.listingType, 'SERVICE');
    });

    // No listing lacks an owner, and nothing creates one without, so a
    // missing owner is a broken row: a 500, not a blank recipient.
    it('is a 500 when the listing has no owner', () => {
        assert.throws(
            () => lib.toSentProposal(makeJobProposalRow(null)),
            (err: unknown) => err instanceof ApiError && err.status === 500,
        );
    });

    it('keeps the proposal fields in the wire shape', () => {
        const result = lib.toSentProposal(
            makeJobProposalRow({
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

    it('gives all zeros for a company with no proposals or hire requests', () => {
        assert.deepEqual(lib.toProposalStatusCounts([]), {
            total: 0,
            pending: 0,
            accepted: 0,
            rejected: 0,
        });
    });
});
