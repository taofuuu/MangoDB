/*
 * Tests for proposal.controller.ts:
 * - GET /proposals/mine/counts (getMyProposalCounts): the numbers on the
 *   Total / Pending / Accepted / Rejected chips of the Your Proposals page
 *   (US2-9).
 * - POST /job-postings/:id/proposals (createProposal, US2-8).
 *
 * What they cover:
 * - The answer counts only the caller's own proposals. Another Provider's
 *   proposals must not leak into the numbers.
 * - ?status= is not read here: the chips must not change when the list
 *   below them is filtered. The list endpoint handles filtering.
 * - A soft-deleted company's job is 404 to a proposal, even while it is still
 *   OPEN, and nothing is written. An active company's open job takes one.
 *
 * How:
 * - The test calls the controller function directly with a fake req and a
 *   fake res that records the JSON body.
 * - lib/prisma is replaced with mock.module before the controller loads, so no
 *   test touches the shared Supabase database. The fake keeps proposal and
 *   listing rows in arrays, answers groupBy by reading `where.senderId`, and
 *   answers listing.findUnique by reading `listingId` and the
 *   `company.deletedAt` filter. So the test checks what comes back, not which
 *   query was run.
 *
 * Run: npm test (in apps/api). Needs --experimental-test-module-mocks, which the
 * test script passes.
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import type { Proposal, ProposalStatusCounts } from '@mangodb/shared';
import { ApiError } from '../lib/ApiError';

type Row = { senderId: number; proposalStatus: string };

// A job posting with its owner's deletedAt joined in.
type ListingRow = {
    listingId: number;
    listingType: 'JOB' | 'SERVICE';
    companyId: number;
    listingStatus: 'OPEN' | 'CLOSED';
    company: { deletedAt: Date | null };
};

let rows: Row[] = [];
let listings: ListingRow[] = [];

const fakePrisma = {
    listing: {
        findUnique: async (args: {
            where: {
                listingId: number;
                company?: { deletedAt: null };
            };
        }) =>
            listings.find(
                (l) =>
                    l.listingId === args.where.listingId &&
                    (args.where.company === undefined ||
                        l.company.deletedAt === null),
            ) ?? null,
    },
    proposal: {
        create: async (args: {
            data: {
                listingId: number;
                senderId: number;
                proposalBudget: number;
                proposalTerms: string;
                duration: number;
                proposalStatus: string;
            };
        }) => {
            rows.push({
                senderId: args.data.senderId,
                proposalStatus: args.data.proposalStatus,
            });
            return {
                ...args.data,
                proposalId: rows.length,
                createdAt: new Date(),
            };
        },
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
    listings = [];
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

describe('POST /job-postings/:jobPostingId/proposals', () => {
    const OWNER = 1;
    const PROVIDER = 2;

    function openJob(listingId: number, deletedAt: Date | null): ListingRow {
        return {
            listingId,
            listingType: 'JOB',
            companyId: OWNER,
            listingStatus: 'OPEN',
            company: { deletedAt },
        };
    }

    // Sends a valid proposal as PROVIDER. Returns the status and JSON it
    // answered with, or the ApiError it threw.
    async function propose(jobPostingId: number): Promise<unknown> {
        const req = {
            auth: { companyId: PROVIDER },
            params: { jobPostingId: String(jobPostingId) },
            body: { proposalBudget: 5000, proposalTerms: 'Terms', duration: 1 },
        } as unknown as Request;
        let status = 200;
        let body: unknown;
        const res = {
            status(code: number) {
                status = code;
                return this;
            },
            json(value: unknown) {
                body = value;
                return this;
            },
        } as unknown as Response;

        try {
            await controller.createProposal(req, res);
        } catch (err) {
            return err;
        }
        return { status, body };
    }

    it("answers 404 for a deleted company's open job and writes nothing", async () => {
        listings = [openJob(10, new Date('2026-01-01'))];

        const result = await propose(10);

        assert.ok(result instanceof ApiError, 'expected an ApiError');
        assert.equal(result.status, 404);
        assert.equal(rows.length, 0);
    });

    it("takes a proposal on an active company's open job", async () => {
        listings = [openJob(10, null)];

        const result = (await propose(10)) as {
            status: number;
            body: Proposal;
        };

        assert.equal(result.status, 201);
        assert.equal(result.body.jobPostingId, 10);
        assert.equal(result.body.providerId, PROVIDER);
        assert.equal(rows.length, 1);
    });
});
