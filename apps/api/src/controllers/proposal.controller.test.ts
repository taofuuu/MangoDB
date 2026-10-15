/*
 * Tests for GET /proposals/mine/counts (getMyProposalCounts in
 * proposal.controller.ts): the numbers on the Total / Pending / Accepted /
 * Rejected chips of the Your Proposals page (US2-9).
 *
 * What they cover:
 * - The answer counts only the caller's own proposals. Another Provider's
 *   proposals must not leak into the numbers.
 * - ?status= is not read here: the chips must not change when the list
 *   below them is filtered. The list endpoint handles filtering.
 *
 * How:
 * - The test calls the controller function directly with a fake req and a
 *   fake res that records the JSON body.
 * - lib/prisma is replaced with mock.module before the controller loads, so no
 *   test touches the shared Supabase database. The fake keeps proposal rows in
 *   an array and answers groupBy by reading `where.senderId`. So the test
 *   checks what comes back, not which query was run.
 *
 * Run: npm test (in apps/api). Needs --experimental-test-module-mocks, which the
 * test script passes.
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import type { ProposalStatusCounts } from '@mangodb/shared';

type Row = { senderId: number; proposalStatus: string };

let rows: Row[] = [];

const fakePrisma = {
    proposal: {
        groupBy: async (args: { where?: { senderId?: number } }) => {
            const totals = new Map<string, number>();
            for (const row of rows) {
                if (
                    args.where?.senderId !== undefined &&
                    row.senderId !== args.where.senderId
                ) {
                    continue;
                }
                totals.set(
                    row.proposalStatus,
                    (totals.get(row.proposalStatus) ?? 0) + 1,
                );
            }
            return [...totals].map(([proposalStatus, n]) => ({
                proposalStatus,
                _count: { _all: n },
            }));
        },
    },
};

function moduleUrl(specifier: string): string {
    return pathToFileURL(require.resolve(specifier)).href;
}

let controller: typeof import('./proposal.controller.js');

before(async () => {
    mock.module(moduleUrl('../lib/prisma'), {
        namedExports: { prisma: fakePrisma },
    });
    controller = await import('./proposal.controller.js');
});

beforeEach(() => {
    rows = [];
});

async function getCounts(
    callerId: number,
    query: Record<string, string> = {},
): Promise<ProposalStatusCounts> {
    let body: unknown;
    const req = { auth: { companyId: callerId }, query } as unknown as Request;
    const res = {
        json(value: unknown) {
            body = value;
            return this;
        },
    } as unknown as Response;

    await controller.getMyProposalCounts(req, res);
    return body as ProposalStatusCounts;
}

describe('GET /proposals/mine/counts', () => {
    it("counts only the caller's own proposals", async () => {
        rows = [
            { senderId: 1, proposalStatus: 'PENDING' },
            { senderId: 1, proposalStatus: 'ACCEPTED' },
            { senderId: 2, proposalStatus: 'PENDING' },
            { senderId: 2, proposalStatus: 'REJECTED' },
        ];

        assert.deepEqual(await getCounts(1), {
            total: 2,
            pending: 1,
            accepted: 1,
            rejected: 0,
        });
    });

    it('ignores ?status=, so the chips stay put while filtering', async () => {
        rows = [
            { senderId: 1, proposalStatus: 'PENDING' },
            { senderId: 1, proposalStatus: 'REJECTED' },
        ];

        assert.deepEqual(await getCounts(1, { status: 'PENDING' }), {
            total: 2,
            pending: 1,
            accepted: 0,
            rejected: 1,
        });
    });
});
