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
 * - POST /proposals/:proposalId/accept (acceptProposal, US2-11): a project is
 *   created, the job closes, and the other pending proposals are rejected.
 *   A refusal (404, 403, 409) changes nothing.
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

// The accept tests need whole proposal rows; the counts tests above only need
// sender and status, so they keep the smaller `rows`.
type ProposalRow = {
    proposalId: number;
    listingId: number;
    proposalBudget: number;
    proposalStatus: string;
};

type ProjectRow = {
    projectId: number;
    proposalId: number;
    totalBudget: number;
    startDate: Date;
    projectStatus: string;
};

let rows: Row[] = [];
let listings: ListingRow[] = [];
let proposals: ProposalRow[] = [];
let projects: ProjectRow[] = [];

// Copies of every table, so a test can check that a refusal wrote nothing.
function snapshotTables(): string {
    return JSON.stringify({ listings, proposals, projects });
}

const fakePrisma = {
    // No rollback here: every refusal in acceptProposalTx throws before its
    // first write, which is what the "changes nothing" tests check.
    $transaction: (work: (tx: unknown) => Promise<unknown>) => work(fakePrisma),
    project: {
        create: async (args: { data: Omit<ProjectRow, 'projectId'> }) => {
            const row = { ...args.data, projectId: projects.length + 1 };
            projects.push(row);
            return row;
        },
    },
    listing: {
        updateMany: async (args: {
            where: { listingId: number; listingStatus: string };
            data: { listingStatus: 'OPEN' | 'CLOSED' };
        }) => {
            const hits = listings.filter(
                (l) =>
                    l.listingId === args.where.listingId &&
                    l.listingStatus === args.where.listingStatus,
            );
            for (const l of hits) l.listingStatus = args.data.listingStatus;
            return { count: hits.length };
        },
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
        // The accept query: one proposal, with its listing joined in.
        findUnique: async (args: { where: { proposalId: number } }) => {
            const p = proposals.find(
                (row) => row.proposalId === args.where.proposalId,
            );
            if (!p) return null;
            const l = listings.find((row) => row.listingId === p.listingId);
            return {
                listingId: p.listingId,
                proposalStatus: p.proposalStatus,
                proposalBudget: p.proposalBudget,
                listing: l
                    ? {
                          listingId: l.listingId,
                          listingStatus: l.listingStatus,
                          companyId: l.companyId,
                      }
                    : null,
            };
        },
        // Matches on the fields acceptProposalTx filters by: one proposal by
        // id, or every other one on the listing ({ not: id }), by status.
        updateMany: async (args: {
            where: {
                proposalId?: number | { not: number };
                listingId?: number;
                proposalStatus: string;
            };
            data: { proposalStatus: string };
        }) => {
            const { proposalId, listingId, proposalStatus } = args.where;
            const hits = proposals.filter(
                (p) =>
                    p.proposalStatus === proposalStatus &&
                    (listingId === undefined || p.listingId === listingId) &&
                    (proposalId === undefined ||
                        (typeof proposalId === 'number'
                            ? p.proposalId === proposalId
                            : p.proposalId !== proposalId.not)),
            );
            for (const p of hits) p.proposalStatus = args.data.proposalStatus;
            return { count: hits.length };
        },
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
    proposals = [];
    projects = [];
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

describe('POST /proposals/:proposalId/accept', () => {
    const OWNER = 1;
    const PROVIDER = 2;

    function job(listingStatus: 'OPEN' | 'CLOSED'): ListingRow {
        return {
            listingId: 10,
            listingType: 'JOB',
            companyId: OWNER,
            listingStatus,
            company: { deletedAt: null },
        };
    }

    function proposal(proposalId: number, proposalStatus: string): ProposalRow {
        return {
            proposalId,
            listingId: 10,
            proposalBudget: 80000,
            proposalStatus,
        };
    }

    // Accepts as callerId. Returns the status and JSON it answered with, or
    // the ApiError it threw.
    async function accept(
        proposalId: number,
        callerId: number,
    ): Promise<unknown> {
        const req = {
            auth: { companyId: callerId },
            params: { proposalId: String(proposalId) },
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
            await controller.acceptProposal(req, res);
        } catch (err) {
            return err;
        }
        return { status, body };
    }

    it('creates the project, closes the job and rejects the others', async () => {
        listings = [job('OPEN')];
        proposals = [
            proposal(1, 'PENDING'),
            proposal(2, 'PENDING'),
            proposal(3, 'REJECTED'),
        ];

        const result = (await accept(1, OWNER)) as {
            status: number;
            body: Record<string, unknown>;
        };

        assert.equal(result.status, 201);
        assert.equal(result.body.proposalId, 1);
        assert.equal(result.body.totalBudget, 80000);
        assert.equal(result.body.status, 'ACTIVE');
        assert.match(String(result.body.startDate), /^\d{4}-\d{2}-\d{2}$/);
        assert.equal(listings[0]!.listingStatus, 'CLOSED');
        assert.deepEqual(
            proposals.map((p) => p.proposalStatus),
            ['ACCEPTED', 'REJECTED', 'REJECTED'],
        );
        assert.equal(projects.length, 1);
    });

    // [what, outcome, proposal status, job status, caller, expected code]
    const refusals: [
        string,
        string,
        'PENDING' | 'ACCEPTED' | 'REJECTED',
        'OPEN' | 'CLOSED',
        number,
        number,
    ][] = [
        ['an unknown proposal', 'is 404', 'PENDING', 'OPEN', OWNER, 404],
        ["someone else's job", 'is 403', 'PENDING', 'OPEN', PROVIDER, 403],
        [
            'a proposal that is not pending',
            'is 409',
            'REJECTED',
            'OPEN',
            OWNER,
            409,
        ],
        ['a closed job', 'is 409', 'PENDING', 'CLOSED', OWNER, 409],
    ];

    for (const [what, outcome, status, jobStatus, caller, code] of refusals) {
        it(`${what} ${outcome} and changes nothing`, async () => {
            listings = [job(jobStatus)];
            proposals = [proposal(1, status), proposal(2, 'PENDING')];
            const before = snapshotTables();
            const id = code === 404 ? 99 : 1;

            const result = await accept(id, caller);

            assert.ok(result instanceof ApiError, 'expected an ApiError');
            assert.equal(result.status, code);
            assert.equal(snapshotTables(), before);
        });
    }
});
