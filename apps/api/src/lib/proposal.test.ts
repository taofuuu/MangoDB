/*
 * Tests for toProviderProposal in lib/proposal.ts: one row of
 * GET /proposals/mine (US2-9, the Provider's "Your Proposals" page).
 *
 * What they cover:
 * - Each proposal carries the job's owner as `receiver` (id, name, photo), so
 *   the page can show who the proposal went to with no extra request per row.
 * - receiver is null when the listing has no owner row. The page shows a
 *   placeholder instead of crashing.
 * - The proposal's own fields keep the shared wire shape: Decimal becomes a
 *   number, Date becomes an ISO string, listingId is renamed jobPostingId.
 *
 * How:
 * - toProviderProposal is a pure function, so the test feeds it a fake row.
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

type Row = Parameters<typeof lib.toProviderProposal>[0];

function makeRow(company: Row['listing']['company']): Row {
    return {
        proposalId: 7,
        listingId: 42,
        senderId: 3,
        proposalBudget: new Prisma.Decimal('15000.50'),
        proposalTerms: 'Two rounds of changes',
        duration: new Prisma.Decimal(14),
        proposalStatus: 'PENDING',
        createdAt: new Date('2026-10-01T08:30:00.000Z'),
        listing: { listingTitle: 'Build a landing page', company },
    };
}

describe('toProviderProposal', () => {
    it('adds the job owner as receiver', () => {
        const result = lib.toProviderProposal(
            makeRow({
                companyId: 9,
                companyName: 'Mango Co',
                companyPhoto: 'https://example.com/m.png',
            }),
        );

        assert.deepEqual(result.receiver, {
            companyId: 9,
            companyName: 'Mango Co',
            companyPhoto: 'https://example.com/m.png',
        });
        assert.equal(result.listingTitle, 'Build a landing page');
    });

    it('gives a null receiver when the listing has no owner', () => {
        const result = lib.toProviderProposal(makeRow(null));

        assert.equal(result.receiver, null);
    });

    it('keeps the proposal fields in the wire shape', () => {
        const result = lib.toProviderProposal(makeRow(null));

        assert.equal(result.jobPostingId, 42);
        assert.equal(result.proposalBudget, 15000.5);
        assert.equal(result.duration, 14);
        assert.equal(result.createdAt, '2026-10-01T08:30:00.000Z');
    });
});
