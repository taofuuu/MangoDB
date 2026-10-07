/*
 * Tests for GET /job-postings and GET /job-postings/:jobPostingId
 * (listJobPostings and getJobPosting in job-posting.controller.ts).
 *
 * What they cover:
 * - Each job carries its owner's name (companyName), on the list and on detail.
 * - Detail: another company's closed job is 404, not 403. A closed job is not
 *   public, so a 403 would tell the caller that the id exists
 *   (docs/conventions.md: fold 403 into 404 when existence is private).
 *   The owner still sees its own closed job.
 * - A soft-deleted company's jobs are hidden from the list and 404 on detail,
 *   even when they are still OPEN (a soft delete does not close them).
 *
 * How:
 * - The test calls the controller functions directly with a fake req and a
 *   fake res that records the JSON body. A thrown ApiError is the error answer
 *   (express-async-errors hands it to errorHandler in the real app).
 * - lib/prisma is replaced with mock.module before the controller loads, so no
 *   test touches the shared Supabase database. The fake keeps job rows in an
 *   array and answers findUnique / findFirst / findMany / count by reading the
 *   `where` the controller sends. It understands only the parts of `where` the
 *   controller uses (AND, OR, plain equals, a `company` relation filter,
 *   `contains`). So the test checks what comes back, not which query was run.
 *
 * Run: npm test (in apps/api). Needs --experimental-test-module-mocks, which the
 * test script passes.
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import type { JobPosting, JobPostingListResponse } from '@mangodb/shared';
import { ApiError } from '../lib/ApiError';

// One listing row as the database would hold it, with its company joined in.
type Row = {
    listingId: number;
    companyId: number;
    listingType: 'JOB' | 'SERVICE';
    listingStatus: 'OPEN' | 'CLOSED' | 'DRAFT';
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number | null;
    createdAt: Date;
    company: { companyName: string; deletedAt: Date | null };
    jobRequirement: null;
    listingCategory: [];
};

const OWNER = 1;
const OTHER = 2;
const GONE = 3; // a soft-deleted company

const companies: Record<number, Row['company']> = {
    [OWNER]: { companyName: 'Owner Co', deletedAt: null },
    [OTHER]: { companyName: 'Other Co', deletedAt: null },
    [GONE]: { companyName: 'Gone Co', deletedAt: new Date('2026-01-01') },
};

let rows: Row[] = [];

function job(
    listingId: number,
    companyId: number,
    listingStatus: Row['listingStatus'],
): Row {
    return {
        listingId,
        companyId,
        listingType: 'JOB',
        listingStatus,
        listingTitle: `Job ${listingId}`,
        listingDesc: 'desc',
        minBudget: null,
        maxBudget: 1000,
        createdAt: new Date(Date.UTC(2026, 0, listingId)),
        company: companies[companyId]!,
        jobRequirement: null,
        listingCategory: [],
    };
}

// Reads the small part of Prisma's `where` language the controller uses.
function matches(row: Record<string, unknown>, where: unknown): boolean {
    if (where === undefined) return true;
    return Object.entries(where as Record<string, unknown>).every(
        ([key, cond]) => {
            if (key === 'AND') {
                return (cond as unknown[]).every((w) => matches(row, w));
            }
            if (key === 'OR') {
                return (cond as unknown[]).some((w) => matches(row, w));
            }
            const value = row[key];
            if (key === 'company') {
                return matches(value as Record<string, unknown>, cond);
            }
            if (
                cond !== null &&
                typeof cond === 'object' &&
                !(cond instanceof Date)
            ) {
                const c = cond as { contains?: string; equals?: unknown };
                if (c.contains !== undefined) {
                    return String(value)
                        .toLowerCase()
                        .includes(c.contains.toLowerCase());
                }
                if ('equals' in c) return value === c.equals;
                throw new Error(`fake prisma: unsupported filter on ${key}`);
            }
            return value === cond;
        },
    );
}

type Args = { where?: unknown; skip?: number; take?: number };

function find(args: Args): Row[] {
    const found = rows
        .filter((r) => matches(r, args.where))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const skip = args.skip ?? 0;
    return found.slice(
        skip,
        args.take === undefined ? undefined : skip + args.take,
    );
}

const fakePrisma = {
    listing: {
        findUnique: async (args: Args) => find(args)[0] ?? null,
        findFirst: async (args: Args) => find(args)[0] ?? null,
        findMany: async (args: Args) => find(args),
        count: async (args: Args) => find({ where: args.where }).length,
    },
    $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
};

function moduleUrl(specifier: string): string {
    return pathToFileURL(require.resolve(specifier)).href;
}

let controller: typeof import('./job-posting.controller.js');

before(async () => {
    mock.module(moduleUrl('../lib/prisma'), {
        namedExports: { prisma: fakePrisma },
    });
    controller = await import('./job-posting.controller.js');
});

beforeEach(() => {
    rows = [];
});

// Runs a controller as `callerCompanyId` and returns the JSON it sent,
// or the ApiError it threw.
async function call(
    handler: (req: Request, res: Response) => Promise<void>,
    callerCompanyId: number,
    input: { params?: Record<string, string>; query?: Record<string, string> },
): Promise<unknown> {
    const req = {
        params: input.params ?? {},
        query: input.query ?? {},
        auth: { companyId: callerCompanyId, role: 'receiver', jti: 'j' },
    } as unknown as Request;
    let body: unknown = 'res.json() was not called';
    const res = {
        status() {
            return this;
        },
        json(b: unknown) {
            body = b;
            return this;
        },
    } as unknown as Response;
    try {
        await handler(req, res);
    } catch (err) {
        return err;
    }
    return body;
}

function getOne(callerCompanyId: number, jobPostingId: number) {
    return call(controller.getJobPosting, callerCompanyId, {
        params: { jobPostingId: String(jobPostingId) },
    });
}

function assertNotFound(result: unknown): void {
    assert.ok(
        result instanceof ApiError,
        `expected an ApiError, got ${JSON.stringify(result)}`,
    );
    assert.equal(result.status, 404);
    assert.equal(result.code, 'NOT_FOUND');
}

describe('GET /job-postings/:jobPostingId', () => {
    it("answers 404, not 403, for another company's closed job", async () => {
        rows = [job(10, OWNER, 'CLOSED')];

        assertNotFound(await getOne(OTHER, 10));
    });

    it("answers 404 for another company's draft job", async () => {
        rows = [job(10, OWNER, 'DRAFT')];

        assertNotFound(await getOne(OTHER, 10));
    });

    it("answers 404 for a deleted company's job, even an open one", async () => {
        rows = [job(30, GONE, 'OPEN')];

        assertNotFound(await getOne(OTHER, 30));
    });

    it("carries the owner's name", async () => {
        rows = [job(10, OWNER, 'OPEN')];

        const body = (await getOne(OTHER, 10)) as JobPosting;

        assert.equal(body.jobPostingId, 10);
        assert.equal(body.companyName, 'Owner Co');
    });

    it('still shows the owner its own closed job', async () => {
        rows = [job(10, OWNER, 'CLOSED')];

        const body = (await getOne(OWNER, 10)) as JobPosting;

        assert.equal(body.jobPostingId, 10);
        assert.equal(body.listingStatus, 'CLOSED');
    });

    it('answers 404 for a service id', async () => {
        rows = [{ ...job(10, OWNER, 'OPEN'), listingType: 'SERVICE' }];

        assertNotFound(await getOne(OTHER, 10));
    });
});

describe('GET /job-postings', () => {
    function list(callerCompanyId: number, query: Record<string, string> = {}) {
        return call(controller.listJobPostings, callerCompanyId, {
            query,
        }) as Promise<JobPostingListResponse>;
    }

    it("gives each job its owner's name", async () => {
        rows = [job(10, OWNER, 'OPEN'), job(11, OTHER, 'OPEN')];

        const body = await list(OTHER);

        assert.deepEqual(
            body.items.map((j) => [j.jobPostingId, j.companyName]),
            [
                [11, 'Other Co'],
                [10, 'Owner Co'],
            ],
        );
    });

    it("hides a deleted company's jobs, open or not, and leaves them out of the count", async () => {
        rows = [
            job(10, OWNER, 'OPEN'),
            job(30, GONE, 'OPEN'),
            job(31, GONE, 'CLOSED'),
        ];

        const body = await list(OTHER);

        assert.deepEqual(
            body.items.map((j) => j.jobPostingId),
            [10],
        );
        assert.equal(body.pagination.totalItems, 1);
    });

    it("hides a deleted company's jobs when filtering by that company", async () => {
        rows = [job(30, GONE, 'OPEN')];

        const body = await list(OTHER, { companyId: String(GONE) });

        assert.deepEqual(body.items, []);
        assert.equal(body.pagination.totalItems, 0);
    });
});
