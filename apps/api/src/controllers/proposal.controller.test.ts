/*
 * Tests for proposal.controller.ts:
 * - GET /proposals/mine (listMyProposals): sent proposals and hire requests for
 *   Providers and Receivers with pagination, status filter, and listingType (US2-9).
 * - GET /proposals/mine/counts (getMyProposalCounts): the numbers on the
 *   Total / Pending / Accepted / Rejected chips of the Your Proposals page
 *   (US2-9).
 * - POST /jobs/:jobId/proposals (createProposal, US2-8).
 * - POST /services/:serviceId/proposals (createServiceProposal, US2-15).
 * - GET /services/:serviceId/proposals (listServiceProposals, US2-16).
 *
 * What they cover:
 * - Each item carries listingType (JOB or SERVICE) and listingTitle.
 * - Another company's proposals must not leak into the results.
 * - Status filtering (?status=) and pagination work correctly.
 * - The count answer counts only the caller's own proposals. Another Provider's
 *   or Receiver's proposals must not leak into the numbers.
 * - ?status= is not read for counts: the chips must not change when the list
 *   below them is filtered. The list endpoint handles filtering.
 * - A soft-deleted company's job or service is 404 to a proposal, even while
 *   it is still OPEN, and nothing is written.
 * - POST /proposals/:proposalId/accept (acceptProposal, US2-11, US2-17): a
 *   project is created; on a job, the job closes and other pending proposals
 *   are rejected; on a service, the service stays OPEN and other pending hire
 *   requests stay PENDING. The project's timeline starts with a
 *   PROPOSAL_ACCEPTED event (#212). A refusal (404, 403, 409) changes nothing.
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
import type {
    Paginated,
    Proposal,
    ProposalStatusCounts,
    ReceivedProposal,
    SentProposal,
} from '@mangodb/shared';
import { ApiError } from '../lib/api-error';

type Row = { senderId: number; proposalStatus: string };

// A job posting or service with its owner's company and deletedAt joined in.
type ListingRow = {
    listingId: number;
    listingTitle?: string;
    listingType: 'JOB' | 'SERVICE';
    companyId: number;
    listingStatus: 'OPEN' | 'CLOSED';
    company: {
        companyId?: number;
        companyName?: string;
        companyPhoto?: string | null;
        deletedAt: Date | null;
    };
};

// The accept and mine tests need whole proposal rows; the counts tests above only need
// sender and status, so they keep the smaller `rows`.
type ProposalRow = {
    proposalId: number;
    listingId: number;
    senderId?: number;
    proposalBudget: number;
    proposalStatus: string;
    proposalTerms?: string;
    duration?: number;
    createdAt?: Date;
    sender?: {
        companyId: number;
        companyName: string;
        companyPhoto: string | null;
    };
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
let projectUpdates: Record<string, unknown>[] = [];

// Copies of every table, so a test can check that a refusal wrote nothing.
function snapshotTables(): string {
    return JSON.stringify({ listings, proposals, projects, projectUpdates });
}

const fakePrisma = {
    // Both forms Prisma has: a list of queries (the paged lists) or a
    // callback given the client (accept). No rollback in either.
    $transaction: (
        work: Promise<unknown>[] | ((tx: unknown) => Promise<unknown>),
    ) => (typeof work === 'function' ? work(fakePrisma) : Promise.all(work)),
    project: {
        create: async (args: { data: Omit<ProjectRow, 'projectId'> }) => {
            const row = { ...args.data, projectId: projects.length + 1 };
            projects.push(row);
            return row;
        },
    },
    projectUpdate: {
        create: async (args: { data: Record<string, unknown> }) => {
            projectUpdates.push(args.data);
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
                          listingType: l.listingType,
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
            const hasPending = proposals.some(
                (p) =>
                    p.listingId === args.data.listingId &&
                    p.senderId === args.data.senderId &&
                    p.proposalStatus === 'PENDING',
            );
            if (hasPending) {
                throw { code: 'P2002' };
            }
            rows.push({
                senderId: args.data.senderId,
                proposalStatus: args.data.proposalStatus,
            });
            const created = {
                ...args.data,
                proposalId: proposals.length + 1,
                createdAt: new Date(),
            };
            proposals.push(created);
            return created;
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
        count: async (args: {
            where: { senderId: number; proposalStatus?: string };
        }) => {
            return proposals.filter(
                (p) =>
                    p.senderId === args.where.senderId &&
                    (args.where.proposalStatus === undefined ||
                        p.proposalStatus === args.where.proposalStatus),
            ).length;
        },
        findMany: async (args: {
            where: {
                senderId?: number;
                listingId?: number;
                proposalStatus?: string;
            };
            skip?: number;
            take?: number;
            orderBy?: unknown;
            select?: unknown;
        }) => {
            let hits = proposals.filter(
                (p) =>
                    (args.where.senderId === undefined ||
                        p.senderId === args.where.senderId) &&
                    (args.where.listingId === undefined ||
                        p.listingId === args.where.listingId) &&
                    (args.where.proposalStatus === undefined ||
                        p.proposalStatus === args.where.proposalStatus),
            );
            hits = [...hits].sort((a, b) => b.proposalId - a.proposalId);
            if (args.skip !== undefined) hits = hits.slice(args.skip);
            if (args.take !== undefined) hits = hits.slice(0, args.take);
            return hits.map((p) => {
                const l = listings.find((row) => row.listingId === p.listingId);
                return {
                    proposalId: p.proposalId,
                    listingId: p.listingId,
                    senderId: p.senderId ?? 0,
                    proposalBudget: p.proposalBudget,
                    proposalTerms: p.proposalTerms ?? 'Terms',
                    duration: p.duration ?? 1,
                    proposalStatus: p.proposalStatus,
                    createdAt:
                        p.createdAt ?? new Date('2026-10-01T08:00:00.000Z'),
                    sender: p.sender ?? {
                        companyId: p.senderId ?? 0,
                        companyName: `Company ${p.senderId ?? 0}`,
                        companyPhoto: null,
                    },
                    listing: {
                        listingTitle: l?.listingTitle ?? 'Listing Title',
                        listingType: l?.listingType ?? 'JOB',
                        company: l
                            ? {
                                  companyId: l.companyId,
                                  companyName:
                                      l.company.companyName ??
                                      `Company ${l.companyId}`,
                                  companyPhoto: l.company.companyPhoto ?? null,
                              }
                            : null,
                    },
                };
            });
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
    projectUpdates = [];
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

async function list(
    callerId: number,
    query: Record<string, string> = {},
): Promise<Paginated<SentProposal>> {
    let body: unknown;
    const req = { auth: { companyId: callerId }, query } as unknown as Request;
    const res = {
        json(value: unknown) {
            body = value;
            return this;
        },
    } as unknown as Response;

    await controller.listMyProposals(req, res);
    return body as Paginated<SentProposal>;
}

describe('GET /proposals/mine', () => {
    const PROVIDER = 1;
    const RECEIVER = 2;

    it('lists sent proposals for a Provider with listingType JOB and recipient', async () => {
        listings = [
            {
                listingId: 10,
                listingTitle: 'Build backend API',
                listingType: 'JOB',
                companyId: RECEIVER,
                listingStatus: 'OPEN',
                company: {
                    companyId: RECEIVER,
                    companyName: 'Client Corp',
                    companyPhoto: 'https://example.com/client.png',
                    deletedAt: null,
                },
            },
        ];
        proposals = [
            {
                proposalId: 101,
                listingId: 10,
                senderId: PROVIDER,
                proposalBudget: 50000,
                proposalTerms: 'Delivery in 2 months',
                duration: 2,
                proposalStatus: 'PENDING',
                createdAt: new Date('2026-10-01T10:00:00.000Z'),
            },
        ];

        const body = await list(PROVIDER);

        assert.equal(body.pagination.totalItems, 1);
        assert.equal(body.items.length, 1);
        const item = body.items[0]!;
        assert.equal(item.proposalId, 101);
        assert.equal(item.listingTitle, 'Build backend API');
        assert.equal(item.listingType, 'JOB');
        assert.equal(item.proposalBudget, 50000);
        assert.equal(item.duration, 2);
        assert.equal(item.proposalStatus, 'PENDING');
        assert.equal(item.recipient.companyId, RECEIVER);
        assert.equal(item.recipient.companyName, 'Client Corp');
    });

    it('filters sent proposals by status', async () => {
        listings = [
            {
                listingId: 10,
                listingTitle: 'Task 1',
                listingType: 'JOB',
                companyId: RECEIVER,
                listingStatus: 'OPEN',
                company: { deletedAt: null },
            },
            {
                listingId: 20,
                listingTitle: 'Task 2',
                listingType: 'SERVICE',
                companyId: PROVIDER,
                listingStatus: 'OPEN',
                company: { deletedAt: null },
            },
        ];
        proposals = [
            {
                proposalId: 1,
                listingId: 10,
                senderId: RECEIVER,
                proposalBudget: 10000,
                proposalStatus: 'PENDING',
            },
            {
                proposalId: 2,
                listingId: 20,
                senderId: RECEIVER,
                proposalBudget: 20000,
                proposalStatus: 'ACCEPTED',
            },
            {
                proposalId: 3,
                listingId: 10,
                senderId: RECEIVER,
                proposalBudget: 30000,
                proposalStatus: 'PENDING',
            },
        ];

        const body = await list(RECEIVER, { status: 'PENDING' });

        assert.equal(body.pagination.totalItems, 2);
        assert.deepEqual(
            body.items.map((i) => i.proposalId),
            [3, 1],
        );
        assert.ok(body.items.every((i) => i.proposalStatus === 'PENDING'));
    });

    it('paginates sent proposals and calculates totalItems and totalPages correctly', async () => {
        listings = [
            {
                listingId: 10,
                listingTitle: 'Task 1',
                listingType: 'JOB',
                companyId: RECEIVER,
                listingStatus: 'OPEN',
                company: { deletedAt: null },
            },
        ];
        proposals = [
            {
                proposalId: 1,
                listingId: 10,
                senderId: PROVIDER,
                proposalBudget: 10000,
                proposalStatus: 'PENDING',
            },
            {
                proposalId: 2,
                listingId: 10,
                senderId: PROVIDER,
                proposalBudget: 20000,
                proposalStatus: 'PENDING',
            },
            {
                proposalId: 3,
                listingId: 10,
                senderId: PROVIDER,
                proposalBudget: 30000,
                proposalStatus: 'PENDING',
            },
        ];

        const page1 = await list(PROVIDER, { page: '1', pageSize: '2' });
        assert.equal(page1.pagination.page, 1);
        assert.equal(page1.pagination.pageSize, 2);
        assert.equal(page1.pagination.totalItems, 3);
        assert.equal(page1.pagination.totalPages, 2);
        assert.deepEqual(
            page1.items.map((i) => i.proposalId),
            [3, 2],
        );

        const page2 = await list(PROVIDER, { page: '2', pageSize: '2' });
        assert.equal(page2.pagination.page, 2);
        assert.equal(page2.pagination.pageSize, 2);
        assert.equal(page2.pagination.totalItems, 3);
        assert.equal(page2.pagination.totalPages, 2);
        assert.deepEqual(
            page2.items.map((i) => i.proposalId),
            [1],
        );
    });

    it("does not leak another company's sent proposals or hire requests", async () => {
        listings = [
            {
                listingId: 10,
                listingTitle: 'Task 1',
                listingType: 'JOB',
                companyId: 99,
                listingStatus: 'OPEN',
                company: { deletedAt: null },
            },
        ];
        proposals = [
            {
                proposalId: 1,
                listingId: 10,
                senderId: PROVIDER,
                proposalBudget: 10000,
                proposalStatus: 'PENDING',
            },
            {
                proposalId: 2,
                listingId: 10,
                senderId: RECEIVER,
                proposalBudget: 20000,
                proposalStatus: 'PENDING',
            },
        ];

        const providerBody = await list(PROVIDER);
        assert.deepEqual(
            providerBody.items.map((i) => i.proposalId),
            [1],
        );

        const receiverBody = await list(RECEIVER);
        assert.deepEqual(
            receiverBody.items.map((i) => i.proposalId),
            [2],
        );
    });
});

describe('POST /jobs/:jobId/proposals', () => {
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
    async function propose(jobId: number): Promise<unknown> {
        const req = {
            auth: { companyId: PROVIDER },
            params: { jobId: String(jobId) },
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
        assert.equal(result.body.listingId, 10);
        assert.equal(result.body.senderId, PROVIDER);
        assert.equal(rows.length, 1);
    });
});

describe('POST /services/:serviceId/proposals', () => {
    const OWNER = 1;
    const RECEIVER = 2;

    function service(
        listingId: number,
        listingStatus: 'OPEN' | 'CLOSED' = 'OPEN',
        deletedAt: Date | null = null,
    ): ListingRow {
        return {
            listingId,
            listingType: 'SERVICE',
            companyId: OWNER,
            listingStatus,
            company: { deletedAt },
        };
    }

    async function hire(
        serviceId: number,
        callerId: number = RECEIVER,
    ): Promise<unknown> {
        const req = {
            auth: { companyId: callerId },
            params: { serviceId: String(serviceId) },
            body: {
                proposalBudget: 12000,
                proposalTerms: 'Hire request terms',
                duration: 1.5,
            },
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
            await controller.createServiceProposal(req, res);
        } catch (err) {
            return err;
        }
        return { status, body };
    }

    it("stores a PENDING hire request on an active company's open service", async () => {
        listings = [service(20)];

        const result = (await hire(20)) as {
            status: number;
            body: Proposal;
        };

        assert.equal(result.status, 201);
        assert.equal(result.body.listingId, 20);
        assert.equal(result.body.senderId, RECEIVER);
        assert.equal(result.body.proposalBudget, 12000);
        assert.equal(result.body.proposalTerms, 'Hire request terms');
        assert.equal(result.body.duration, 1.5);
        assert.equal(result.body.proposalStatus, 'PENDING');
        assert.equal(proposals.length, 1);
    });

    it('answers 404 for an unknown service, a job ID, or a deleted-owner service and writes nothing', async () => {
        listings = [
            {
                listingId: 10,
                listingType: 'JOB',
                companyId: OWNER,
                listingStatus: 'OPEN',
                company: { deletedAt: null },
            },
            service(20, 'OPEN', new Date('2026-01-01')),
        ];
        const before = snapshotTables();

        for (const id of [99, 10, 20]) {
            const result = await hire(id);
            assert.ok(result instanceof ApiError, 'expected an ApiError');
            assert.equal(result.status, 404);
            assert.equal(result.message, 'Service not found');
            assert.equal(snapshotTables(), before);
        }
    });

    it('answers 403 when sending a hire request to your own service and writes nothing', async () => {
        listings = [service(20)];
        const before = snapshotTables();

        const result = await hire(20, OWNER);

        assert.ok(result instanceof ApiError, 'expected an ApiError');
        assert.equal(result.status, 403);
        assert.equal(
            result.message,
            'You cannot send a hire request to your own service',
        );
        assert.equal(snapshotTables(), before);
    });

    it('answers 409 when the service is closed and writes nothing', async () => {
        listings = [service(20, 'CLOSED')];
        const before = snapshotTables();

        const result = await hire(20);

        assert.ok(result instanceof ApiError, 'expected an ApiError');
        assert.equal(result.status, 409);
        assert.equal(
            result.message,
            'This service is not open for hire requests',
        );
        assert.equal(snapshotTables(), before);
    });

    it('answers 409 for a second pending hire request, then allows a new one once decided (ADR 0016)', async () => {
        listings = [service(20)];

        const first = (await hire(20)) as { status: number; body: Proposal };
        assert.equal(first.status, 201);

        const beforeRepeat = snapshotTables();
        const secondPending = await hire(20);
        assert.ok(secondPending instanceof ApiError, 'expected an ApiError');
        assert.equal(secondPending.status, 409);
        assert.equal(
            secondPending.message,
            'You already have a pending hire request on this service',
        );
        assert.equal(snapshotTables(), beforeRepeat);

        proposals[0]!.proposalStatus = 'REJECTED';
        const afterRejected = (await hire(20)) as {
            status: number;
            body: Proposal;
        };
        assert.equal(afterRejected.status, 201);
        assert.equal(afterRejected.body.proposalStatus, 'PENDING');
        assert.equal(proposals.length, 2);

        proposals[1]!.proposalStatus = 'ACCEPTED';
        const afterAccepted = (await hire(20)) as {
            status: number;
            body: Proposal;
        };
        assert.equal(afterAccepted.status, 201);
        assert.equal(afterAccepted.body.proposalStatus, 'PENDING');
        assert.equal(proposals.length, 3);
    });
});

describe('GET /services/:serviceId/proposals', () => {
    const OWNER = 1;
    const OTHER_PROVIDER = 2;
    const RECEIVER_A = 3;
    const RECEIVER_B = 4;

    async function listForService(
        serviceId: number,
        callerId: number = OWNER,
    ): Promise<unknown> {
        const req = {
            auth: { companyId: callerId },
            params: { serviceId: String(serviceId) },
        } as unknown as Request;
        let body: unknown;
        const res = {
            json(value: unknown) {
                body = value;
                return this;
            },
        } as unknown as Response;

        try {
            await controller.listServiceProposals(req, res);
        } catch (err) {
            return err;
        }
        return body;
    }

    it("lists hire requests on the owner's service newest first with sender brief", async () => {
        listings = [
            {
                listingId: 20,
                listingType: 'SERVICE',
                companyId: OWNER,
                listingStatus: 'OPEN',
                company: { deletedAt: null },
            },
            {
                listingId: 21,
                listingType: 'SERVICE',
                companyId: OWNER,
                listingStatus: 'OPEN',
                company: { deletedAt: null },
            },
        ];
        proposals = [
            {
                proposalId: 1,
                listingId: 20,
                senderId: RECEIVER_A,
                proposalBudget: 15000,
                proposalTerms: 'First request',
                duration: 1,
                proposalStatus: 'PENDING',
                sender: {
                    companyId: RECEIVER_A,
                    companyName: 'Receiver Alpha',
                    companyPhoto: 'https://example.com/alpha.png',
                },
            },
            {
                proposalId: 2,
                listingId: 21,
                senderId: RECEIVER_B,
                proposalBudget: 99000,
                proposalStatus: 'PENDING',
            },
            {
                proposalId: 3,
                listingId: 20,
                senderId: RECEIVER_B,
                proposalBudget: 25000,
                proposalTerms: 'Second request',
                duration: 2,
                proposalStatus: 'ACCEPTED',
                sender: {
                    companyId: RECEIVER_B,
                    companyName: 'Receiver Beta',
                    companyPhoto: null,
                },
            },
        ];

        const result = (await listForService(20, OWNER)) as ReceivedProposal[];

        assert.equal(result.length, 2);
        assert.deepEqual(
            result.map((r) => r.proposalId),
            [3, 1],
        );
        assert.equal(result[0]!.sender.companyName, 'Receiver Beta');
        assert.equal(result[1]!.sender.companyName, 'Receiver Alpha');
        assert.equal(
            result[1]!.sender.companyPhoto,
            'https://example.com/alpha.png',
        );
    });

    it('answers 404 for an unknown service or a job ID', async () => {
        listings = [
            {
                listingId: 10,
                listingType: 'JOB',
                companyId: OWNER,
                listingStatus: 'OPEN',
                company: { deletedAt: null },
            },
        ];

        for (const id of [99, 10]) {
            const result = await listForService(id, OWNER);
            assert.ok(result instanceof ApiError, 'expected an ApiError');
            assert.equal(result.status, 404);
            assert.equal(result.message, 'Service not found');
        }
    });

    it('answers 403 when the service belongs to another company', async () => {
        listings = [
            {
                listingId: 20,
                listingType: 'SERVICE',
                companyId: OWNER,
                listingStatus: 'OPEN',
                company: { deletedAt: null },
            },
        ];

        const result = await listForService(20, OTHER_PROVIDER);

        assert.ok(result instanceof ApiError, 'expected an ApiError');
        assert.equal(result.status, 403);
        assert.equal(result.message, 'This service belongs to another company');
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

    function service(listingStatus: 'OPEN' | 'CLOSED'): ListingRow {
        return {
            listingId: 20,
            listingType: 'SERVICE',
            companyId: OWNER,
            listingStatus,
            company: { deletedAt: null },
        };
    }

    function proposal(
        proposalId: number,
        proposalStatus: string,
        listingId: number = 10,
    ): ProposalRow {
        return {
            proposalId,
            listingId,
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
        assert.equal(result.body.projectStatus, 'AWAITING_QUOTATION');
        assert.match(String(result.body.startDate), /^\d{4}-\d{2}-\d{2}$/);
        assert.equal(listings[0]!.listingStatus, 'CLOSED');
        assert.deepEqual(
            proposals.map((p) => p.proposalStatus),
            ['ACCEPTED', 'REJECTED', 'REJECTED'],
        );
        assert.equal(projects.length, 1);
        assert.deepEqual(projectUpdates, [
            { projectId: 1, updateType: 'PROPOSAL_ACCEPTED' },
        ]);
    });

    it('on a service, creates the project, keeps the service OPEN and leaves other requests PENDING (US2-17)', async () => {
        listings = [service('OPEN')];
        proposals = [
            proposal(1, 'PENDING', 20),
            proposal(2, 'PENDING', 20),
            proposal(3, 'REJECTED', 20),
        ];

        const first = (await accept(1, OWNER)) as {
            status: number;
            body: Record<string, unknown>;
        };

        assert.equal(first.status, 201);
        assert.equal(first.body.proposalId, 1);
        assert.equal(first.body.totalBudget, 80000);
        assert.equal(first.body.projectStatus, 'AWAITING_QUOTATION');
        assert.equal(listings[0]!.listingStatus, 'OPEN');
        assert.deepEqual(
            proposals.map((p) => p.proposalStatus),
            ['ACCEPTED', 'PENDING', 'REJECTED'],
        );
        assert.equal(projects.length, 1);

        // Because the service stays OPEN and proposal 2 stays PENDING, the
        // Provider can accept the second hire request too.
        const second = (await accept(2, OWNER)) as {
            status: number;
            body: Record<string, unknown>;
        };

        assert.equal(second.status, 201);
        assert.equal(second.body.proposalId, 2);
        assert.equal(listings[0]!.listingStatus, 'OPEN');
        assert.deepEqual(
            proposals.map((p) => p.proposalStatus),
            ['ACCEPTED', 'ACCEPTED', 'REJECTED'],
        );
        assert.equal(projects.length, 2);
        assert.deepEqual(projectUpdates, [
            { projectId: 1, updateType: 'PROPOSAL_ACCEPTED' },
            { projectId: 2, updateType: 'PROPOSAL_ACCEPTED' },
        ]);
    });

    // A service skips closeOpenListing; only the status check refuses it.
    it('a closed service is 409 and changes nothing', async () => {
        listings = [service('CLOSED')];
        proposals = [proposal(1, 'PENDING', 20)];
        const before = snapshotTables();

        const result = await accept(1, OWNER);

        assert.ok(result instanceof ApiError, 'expected an ApiError');
        assert.equal(result.status, 409);
        assert.equal(snapshotTables(), before);
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
