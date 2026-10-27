/*
 * Tests for GET /jobs, GET /jobs/:jobId and
 * POST /jobs/:jobId/close (listJobs, getJob and
 * closeJob in job.controller.ts).
 *
 * What they cover:
 * - Each job carries its owner (company), on the list and on detail.
 * - Detail: another company's closed job is 404, not 403. A closed job is not
 *   public, so a 403 would tell the caller that the id exists
 *   (docs/conventions.md: fold 403 into 404 when existence is private).
 *   The owner still sees its own closed job.
 * - A soft-deleted company's jobs are hidden from the list and 404 on detail,
 *   even when they are still OPEN (a soft delete does not close them).
 * - The keyword: each word matches on its own, and "%" is a plain character,
 *   not a wildcard that matches every job.
 * - Close: the job turns CLOSED and its pending proposals are rejected.
 *   Another company's job is 403 and a closed one is 409, and neither
 *   changes anything.
 *
 * How:
 * - The test calls the controller functions directly with a fake req and a
 *   fake res that records the JSON body. A thrown ApiError is the error answer
 *   (Express 5 hands a rejected handler's error to errorHandler in the real app).
 * - lib/prisma is replaced with mock.module before the controller loads, so no
 *   test touches the shared Supabase database. The fake keeps job rows in an
 *   array and answers findUnique / findFirst / findMany / count by reading the
 *   `where` the controller sends. It understands only the parts of `where` the
 *   controller uses (AND, OR, plain equals, a `company` relation filter,
 *   `contains` read as SQL LIKE). So the test checks what comes back, not
 *   which query was run.
 *
 * Run: npm test (in apps/api). Needs --experimental-test-module-mocks, which the
 * test script passes.
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import type { Job, Paginated } from '@mangodb/shared';
import { ApiError } from '../lib/api-error';
import { fromDateOnly } from '../lib/dates';

// One listing row as the database would hold it, with its company joined in.
type Row = {
    listingId: number;
    companyId: number;
    listingType: 'JOB' | 'SERVICE';
    listingStatus: 'OPEN' | 'CLOSED';
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number | null;
    createdAt: Date;
    company: {
        companyId: number;
        companyName: string;
        companyPhoto: string | null;
        deletedAt: Date | null;
    };
    job: {
        locationPref: string | null;
        duration: string | null;
        deadline: Date | null;
    } | null;
    listingCategory: {
        categoryId: number;
        category: { categoryName: string };
    }[];
};

const OWNER = 1;
const OTHER = 2;
const GONE = 3; // a soft-deleted company

const companies: Record<number, Row['company']> = {
    [OWNER]: {
        companyId: OWNER,
        companyName: 'Owner Co',
        companyPhoto: null,
        deletedAt: null,
    },
    [OTHER]: {
        companyId: OTHER,
        companyName: 'Other Co',
        companyPhoto: null,
        deletedAt: null,
    },
    [GONE]: {
        companyId: GONE,
        companyName: 'Gone Co',
        companyPhoto: null,
        deletedAt: new Date('2026-01-01'),
    },
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
        job: null,
        listingCategory: [],
    };
}

function withCategories(r: Row, names: string[]): Row {
    return {
        ...r,
        listingCategory: names.map((name, i) => ({
            categoryId: i + 1,
            category: { categoryName: name },
        })),
    };
}

function withBudget(
    r: Row,
    minBudget: number | null,
    maxBudget: number | null,
): Row {
    return { ...r, minBudget, maxBudget };
}

function withDeadline(r: Row, deadline: Date | null): Row {
    return {
        ...r,
        job: {
            locationPref: r.job?.locationPref ?? null,
            duration: r.job?.duration ?? null,
            deadline,
        },
    };
}

// Prisma's `contains` becomes SQL LIKE: % is any run of characters, _ is any
// one character, and a backslash makes the next character plain. Reading it
// the same way here is what catches a search that forgets escapeLike.
function likeToRegExp(pattern: string): RegExp {
    const plain = (ch: string) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let source = '';
    for (let i = 0; i < pattern.length; i++) {
        const ch = pattern.charAt(i);
        if (ch === '\\' && i + 1 < pattern.length) {
            i++;
            source += plain(pattern.charAt(i));
        } else if (ch === '%') {
            source += '.*';
        } else if (ch === '_') {
            source += '.';
        } else {
            source += plain(ch);
        }
    }
    // The controller always asks for mode: 'insensitive'.
    return new RegExp(source, 'i');
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
            if (key === 'job') {
                if (value === null || value === undefined) return false;
                return matches(value as Record<string, unknown>, cond);
            }
            if (key === 'listingCategory') {
                const condObj = cond as {
                    some?: {
                        category?: {
                            categoryName?: { in?: string[]; mode?: string };
                        };
                    };
                };
                const inList = condObj.some?.category?.categoryName?.in;
                if (inList !== undefined) {
                    const insensitive =
                        condObj.some?.category?.categoryName?.mode ===
                        'insensitive';
                    const fold = (s: string) =>
                        insensitive ? s.toLowerCase() : s;
                    const wanted = new Set(inList.map(fold));
                    const list = value as {
                        category: { categoryName: string };
                    }[];
                    return list.some((item) =>
                        wanted.has(fold(item.category.categoryName)),
                    );
                }
            }
            if (
                cond !== null &&
                typeof cond === 'object' &&
                !(cond instanceof Date)
            ) {
                const c = cond as {
                    contains?: string;
                    equals?: unknown;
                    lte?: unknown;
                    gte?: unknown;
                    not?: unknown;
                };
                if (c.contains !== undefined) {
                    return likeToRegExp(c.contains).test(String(value));
                }
                if ('equals' in c) return value === c.equals;
                if ('lte' in c) {
                    if (value === null || value === undefined) return false;
                    if (value instanceof Date && c.lte instanceof Date) {
                        return value.getTime() <= c.lte.getTime();
                    }
                    return (value as number) <= (c.lte as number);
                }
                if ('gte' in c) {
                    if (value === null || value === undefined) return false;
                    if (value instanceof Date && c.gte instanceof Date) {
                        return value.getTime() >= c.gte.getTime();
                    }
                    return (value as number) >= (c.gte as number);
                }
                if ('not' in c) return value !== c.not;
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

// Proposals on a job, for the close tests: only the fields close reads.
type ProposalRow = { listingId: number; proposalStatus: string };
let proposals: ProposalRow[] = [];

const fakePrisma = {
    listing: {
        findUnique: async (args: Args) => find(args)[0] ?? null,
        findUniqueOrThrow: async (args: Args) => {
            const row = find(args)[0];
            if (!row) throw new Error('fake prisma: no such row');
            return row;
        },
        findFirst: async (args: Args) => find(args)[0] ?? null,
        findMany: async (args: Args) => find(args),
        count: async (args: Args) => find({ where: args.where }).length,
        updateMany: async (args: {
            where: unknown;
            data: { listingStatus: Row['listingStatus'] };
        }) => {
            const hits = rows.filter((r) => matches(r, args.where));
            for (const r of hits) r.listingStatus = args.data.listingStatus;
            return { count: hits.length };
        },
    },
    proposal: {
        updateMany: async (args: {
            where: unknown;
            data: { proposalStatus: string };
        }) => {
            const hits = proposals.filter((p) => matches(p, args.where));
            for (const p of hits) p.proposalStatus = args.data.proposalStatus;
            return { count: hits.length };
        },
    },
    // Both forms Prisma has: a list of queries (the paged lists) or a
    // callback given the client (close). No rollback in either.
    $transaction: (
        work: Promise<unknown>[] | ((tx: unknown) => Promise<unknown>),
    ) => (typeof work === 'function' ? work(fakePrisma) : Promise.all(work)),
};

function moduleUrl(specifier: string): string {
    return pathToFileURL(require.resolve(specifier)).href;
}

let controller: typeof import('./job.controller.js');

before(async () => {
    mock.module(moduleUrl('../lib/prisma'), {
        namedExports: { prisma: fakePrisma },
    });
    controller = await import('./job.controller.js');
});

beforeEach(() => {
    rows = [];
    proposals = [];
});

// Runs a controller as `callerCompanyId` and returns the JSON it sent,
// or the ApiError it threw.
async function call(
    handler: (req: Request, res: Response) => Promise<void>,
    callerCompanyId: number,
    input: {
        params?: Record<string, string>;
        query?: Record<string, string | string[]>;
    },
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

function getOne(callerCompanyId: number, jobId: number) {
    return call(controller.getJob, callerCompanyId, {
        params: { jobId: String(jobId) },
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

function assertBadRequest(result: unknown): void {
    assert.ok(
        result instanceof ApiError,
        `expected an ApiError, got ${JSON.stringify(result)}`,
    );
    assert.equal(result.status, 400);
}

describe('GET /jobs/:jobId', () => {
    it("answers 404, not 403, for another company's closed job", async () => {
        rows = [job(10, OWNER, 'CLOSED')];

        assertNotFound(await getOne(OTHER, 10));
    });

    it("answers 404 for a deleted company's job, even an open one", async () => {
        rows = [job(30, GONE, 'OPEN')];

        assertNotFound(await getOne(OTHER, 30));
    });

    it("carries the owner's name", async () => {
        rows = [job(10, OWNER, 'OPEN')];

        const body = (await getOne(OTHER, 10)) as Job;

        assert.equal(body.jobId, 10);
        assert.equal(body.company.companyName, 'Owner Co');
    });

    it('still shows the owner its own closed job', async () => {
        rows = [job(10, OWNER, 'CLOSED')];

        const body = (await getOne(OWNER, 10)) as Job;

        assert.equal(body.jobId, 10);
        assert.equal(body.listingStatus, 'CLOSED');
    });

    it('answers 404 for a service id', async () => {
        rows = [{ ...job(10, OWNER, 'OPEN'), listingType: 'SERVICE' }];

        assertNotFound(await getOne(OTHER, 10));
    });
});

describe('GET /jobs', () => {
    function list(
        callerCompanyId: number,
        query: Record<string, string | string[]> = {},
    ) {
        return call(controller.listJobs, callerCompanyId, {
            query,
        }) as Promise<Paginated<Job>>;
    }

    it("gives each job its owner's name", async () => {
        rows = [job(10, OWNER, 'OPEN'), job(11, OTHER, 'OPEN')];

        const body = await list(OTHER);

        assert.deepEqual(
            body.items.map((j) => [j.jobId, j.company.companyName]),
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
            body.items.map((j) => j.jobId),
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

    it('reads % in a keyword as a plain character, not a wildcard', async () => {
        rows = [
            { ...job(10, OWNER, 'OPEN'), listingTitle: '50% off rebuild' },
            job(11, OWNER, 'OPEN'),
        ];

        const body = await list(OTHER, { q: '%' });

        assert.deepEqual(
            body.items.map((j) => j.jobId),
            [10],
        );
    });

    it('matches each keyword word on its own', async () => {
        rows = [
            {
                ...job(10, OWNER, 'OPEN'),
                listingTitle: 'React app',
                listingDesc: 'Needs a payment page',
            },
            { ...job(11, OWNER, 'OPEN'), listingTitle: 'React app' },
        ];

        const body = await list(OTHER, { q: 'react payment' });

        assert.deepEqual(
            body.items.map((j) => j.jobId),
            [10],
        );
    });

    it('filters by a single category name', async () => {
        rows = [
            withCategories(job(10, OWNER, 'OPEN'), ['Web Development']),
            withCategories(job(11, OWNER, 'OPEN'), ['Design']),
        ];

        const body = await list(OTHER, { category: 'Web Development' });

        assert.deepEqual(
            body.items.map((j) => j.jobId),
            [10],
        );
        assert.equal(body.pagination.totalItems, 1);
    });

    it('matches category names case-insensitively', async () => {
        rows = [
            withCategories(job(10, OWNER, 'OPEN'), ['Web Development']),
            withCategories(job(11, OWNER, 'OPEN'), ['Design']),
        ];

        const body = await list(OTHER, { category: 'web development' });

        assert.deepEqual(
            body.items.map((j) => j.jobId),
            [10],
        );
    });

    it('matches multiple categories with OR logic', async () => {
        rows = [
            withCategories(job(10, OWNER, 'OPEN'), ['Web Development']),
            withCategories(job(11, OWNER, 'OPEN'), ['Mobile App Development']),
            withCategories(job(12, OWNER, 'OPEN'), ['Data Analytics']),
        ];

        const body = await list(OTHER, {
            category: ['Web Development', 'Mobile App Development'],
        });

        assert.deepEqual(
            body.items.map((j) => j.jobId),
            [11, 10],
        );
        assert.equal(body.pagination.totalItems, 2);
    });

    it('combines category filter with keyword q (AND logic)', async () => {
        rows = [
            withCategories(
                { ...job(10, OWNER, 'OPEN'), listingTitle: 'React developer' },
                ['Web Development'],
            ),
            withCategories(
                { ...job(11, OWNER, 'OPEN'), listingTitle: 'Vue developer' },
                ['Web Development'],
            ),
            withCategories(
                { ...job(12, OWNER, 'OPEN'), listingTitle: 'React Native' },
                ['Mobile App Development'],
            ),
        ];

        const body = await list(OTHER, {
            q: 'react',
            category: 'Web Development',
        });

        assert.deepEqual(
            body.items.map((j) => j.jobId),
            [10],
        );
        assert.equal(body.pagination.totalItems, 1);
    });

    it('combines category filter with companyId and status', async () => {
        rows = [
            withCategories(job(10, OWNER, 'OPEN'), ['Web Development']),
            withCategories(job(11, OTHER, 'OPEN'), ['Web Development']),
            withCategories(job(12, OWNER, 'CLOSED'), ['Web Development']),
        ];

        const body = await list(OWNER, {
            category: 'Web Development',
            companyId: String(OWNER),
            status: 'CLOSED',
        });

        assert.deepEqual(
            body.items.map((j) => j.jobId),
            [12],
        );
        assert.equal(body.pagination.totalItems, 1);
    });

    it('returns an empty page for a non-matching category', async () => {
        rows = [withCategories(job(10, OWNER, 'OPEN'), ['Web Development'])];

        const body = await list(OTHER, { category: 'Nonexistent Category' });

        assert.deepEqual(body.items, []);
        assert.equal(body.pagination.totalItems, 0);
    });

    it('ignores blank category values', async () => {
        rows = [
            withCategories(job(10, OWNER, 'OPEN'), ['Web Development']),
            withCategories(job(11, OWNER, 'OPEN'), ['Design']),
        ];

        const body = await list(OTHER, { category: '   ' });

        assert.equal(body.pagination.totalItems, 2);
    });

    it('calculates totalItems and totalPages correctly with category filter and pagination', async () => {
        rows = [
            withCategories(job(10, OWNER, 'OPEN'), ['Web Development']),
            withCategories(job(11, OWNER, 'OPEN'), ['Web Development']),
            withCategories(job(12, OWNER, 'OPEN'), ['Design']),
        ];

        const page1 = await list(OTHER, {
            category: 'Web Development',
            page: '1',
            pageSize: '1',
        });

        assert.equal(page1.items.length, 1);
        assert.equal(page1.items[0]?.jobId, 11);
        assert.equal(page1.pagination.totalItems, 2);
        assert.equal(page1.pagination.totalPages, 2);

        const page2 = await list(OTHER, {
            category: 'Web Development',
            page: '2',
            pageSize: '1',
        });

        assert.equal(page2.items.length, 1);
        assert.equal(page2.items[0]?.jobId, 10);
        assert.equal(page2.pagination.totalItems, 2);
    });

    it('filters jobs by budget range overlap (minBudget and maxBudget)', async () => {
        rows = [
            withBudget(job(10, OWNER, 'OPEN'), 1000, 3000), // overlaps [2500, 4500]
            withBudget(job(11, OWNER, 'OPEN'), 4000, 6000), // overlaps [2500, 4500]
            withBudget(job(12, OWNER, 'OPEN'), 5000, 8000), // does not overlap (min 5000 > max 4500)
            withBudget(job(13, OWNER, 'OPEN'), 500, 2000), // does not overlap (max 2000 < min 2500)
        ];

        const body = await list(OTHER, {
            minBudget: '2500',
            maxBudget: '4500',
        });

        assert.deepEqual(
            body.items.map((j) => j.jobId),
            [11, 10],
        );
        assert.equal(body.pagination.totalItems, 2);
    });

    it('filters jobs by maxBudget only', async () => {
        rows = [
            withBudget(job(10, OWNER, 'OPEN'), 1000, 3000), // min 1000 <= 2000 -> matches
            withBudget(job(11, OWNER, 'OPEN'), 2500, 5000), // min 2500 > 2000 -> excluded
            withBudget(job(12, OWNER, 'OPEN'), null, 3000), // "Up to 3000" -> matches
        ];

        const body = await list(OTHER, { maxBudget: '2000' });

        assert.deepEqual(
            body.items.map((j) => j.jobId),
            [12, 10],
        );
    });

    it('filters jobs by minBudget only, including open-ended listings', async () => {
        rows = [
            withBudget(job(10, OWNER, 'OPEN'), 1000, 3000), // max 3000 >= 2000 -> matches
            withBudget(job(11, OWNER, 'OPEN'), 500, 1500), // max 1500 < 2000 -> excluded
            withBudget(job(12, OWNER, 'OPEN'), 2500, null), // open-ended (min 2500, max null) -> matches
        ];

        const body = await list(OTHER, { minBudget: '2000' });

        assert.deepEqual(
            body.items.map((j) => j.jobId),
            [12, 10],
        );
    });

    it('excludes unpriced jobs when filtering by budget', async () => {
        rows = [
            withBudget(job(10, OWNER, 'OPEN'), null, null), // unpriced
            withBudget(job(11, OWNER, 'OPEN'), 1000, 3000),
        ];

        const bodyMax = await list(OTHER, { maxBudget: '5000' });
        assert.deepEqual(
            bodyMax.items.map((j) => j.jobId),
            [11],
        );

        const bodyMin = await list(OTHER, { minBudget: '500' });
        assert.deepEqual(
            bodyMin.items.map((j) => j.jobId),
            [11],
        );
    });

    it('answers 400 when minBudget exceeds maxBudget', async () => {
        rows = [job(10, OWNER, 'OPEN')];

        const result = await list(OTHER, {
            minBudget: '5000',
            maxBudget: '2000',
        });

        assertBadRequest(result);
    });

    it('answers 400 when minBudget is negative', async () => {
        rows = [job(10, OWNER, 'OPEN')];

        const result = await list(OTHER, { minBudget: '-100' });

        assertBadRequest(result);
    });

    it('ignores blank minBudget and maxBudget values', async () => {
        rows = [job(10, OWNER, 'OPEN'), job(11, OWNER, 'OPEN')];

        const body = await list(OTHER, { minBudget: '', maxBudget: '   ' });

        assert.equal(body.pagination.totalItems, 2);
    });

    it('filters jobs due on or before the given deadline', async () => {
        rows = [
            withDeadline(job(10, OWNER, 'OPEN'), fromDateOnly('2026-05-15')), // on deadline
            withDeadline(job(11, OWNER, 'OPEN'), fromDateOnly('2026-05-10')), // before deadline
            withDeadline(job(12, OWNER, 'OPEN'), fromDateOnly('2026-05-20')), // after deadline
            withDeadline(job(13, OWNER, 'OPEN'), null), // no deadline
            job(14, OWNER, 'OPEN'), // job relation is null
        ];

        const body = await list(OTHER, { deadline: '2026-05-15' });

        assert.deepEqual(
            body.items.map((j) => j.jobId),
            [11, 10],
        );
        assert.equal(body.pagination.totalItems, 2);
    });

    it('filters jobs due on or after the given deadline when deadlineType is AFTER', async () => {
        rows = [
            withDeadline(job(10, OWNER, 'OPEN'), fromDateOnly('2026-05-15')), // on deadline
            withDeadline(job(11, OWNER, 'OPEN'), fromDateOnly('2026-05-10')), // before deadline
            withDeadline(job(12, OWNER, 'OPEN'), fromDateOnly('2026-05-20')), // after deadline
            withDeadline(job(13, OWNER, 'OPEN'), null), // no deadline
            job(14, OWNER, 'OPEN'), // job relation is null
        ];

        const body = await list(OTHER, {
            deadline: '2026-05-15',
            deadlineType: 'AFTER',
        });

        assert.deepEqual(
            body.items.map((j) => j.jobId),
            [12, 10],
        );
        assert.equal(body.pagination.totalItems, 2);
    });

    it('does not filter by deadline when deadlineType is ANY', async () => {
        rows = [
            withDeadline(job(10, OWNER, 'OPEN'), fromDateOnly('2026-05-15')),
            withDeadline(job(11, OWNER, 'OPEN'), fromDateOnly('2026-05-10')),
            withDeadline(job(12, OWNER, 'OPEN'), fromDateOnly('2026-05-20')),
            withDeadline(job(13, OWNER, 'OPEN'), null),
            job(14, OWNER, 'OPEN'),
        ];

        const body = await list(OTHER, {
            deadline: '2026-05-15',
            deadlineType: 'ANY',
        });

        assert.equal(body.pagination.totalItems, 5);
    });

    it('answers 400 when deadline is not a valid YYYY-MM-DD date', async () => {
        rows = [job(10, OWNER, 'OPEN')];

        assertBadRequest(await list(OTHER, { deadline: 'not-a-date' }));
        assertBadRequest(await list(OTHER, { deadline: '2026-02-31' }));
    });

    it('ignores blank deadline query values', async () => {
        rows = [
            withDeadline(job(10, OWNER, 'OPEN'), fromDateOnly('2026-05-15')),
            job(11, OWNER, 'OPEN'),
        ];

        const body = await list(OTHER, { deadline: '   ' });

        assert.equal(body.pagination.totalItems, 2);
    });

    it('combines category, keyword, budget, and deadline filters (AND logic)', async () => {
        rows = [
            // Matches all: Web Development, "React", budget overlaps [2000, 5000], deadline <= 2026-06-01
            withDeadline(
                withBudget(
                    withCategories(
                        {
                            ...job(10, OWNER, 'OPEN'),
                            listingTitle: 'React web app',
                        },
                        ['Web Development'],
                    ),
                    2000,
                    4000,
                ),
                fromDateOnly('2026-05-15'),
            ),
            // Fails category
            withDeadline(
                withBudget(
                    withCategories(
                        {
                            ...job(11, OWNER, 'OPEN'),
                            listingTitle: 'React design system',
                        },
                        ['Design'],
                    ),
                    2000,
                    4000,
                ),
                fromDateOnly('2026-05-15'),
            ),
            // Fails keyword
            withDeadline(
                withBudget(
                    withCategories(
                        {
                            ...job(12, OWNER, 'OPEN'),
                            listingTitle: 'Vue web app',
                        },
                        ['Web Development'],
                    ),
                    2000,
                    4000,
                ),
                fromDateOnly('2026-05-15'),
            ),
            // Fails budget (min 6000 > max 5000)
            withDeadline(
                withBudget(
                    withCategories(
                        {
                            ...job(13, OWNER, 'OPEN'),
                            listingTitle: 'React portal',
                        },
                        ['Web Development'],
                    ),
                    6000,
                    8000,
                ),
                fromDateOnly('2026-05-15'),
            ),
            // Fails deadline (2026-07-01 > 2026-06-01)
            withDeadline(
                withBudget(
                    withCategories(
                        {
                            ...job(14, OWNER, 'OPEN'),
                            listingTitle: 'React dashboard',
                        },
                        ['Web Development'],
                    ),
                    2000,
                    4000,
                ),
                fromDateOnly('2026-07-01'),
            ),
        ];

        const body = await list(OTHER, {
            category: 'Web Development',
            q: 'react',
            minBudget: '2000',
            maxBudget: '5000',
            deadline: '2026-06-01',
        });

        assert.deepEqual(
            body.items.map((j) => j.jobId),
            [10],
        );
        assert.equal(body.pagination.totalItems, 1);
    });

    it('calculates totalItems and totalPages correctly with budget and deadline filters', async () => {
        rows = [
            withDeadline(
                withBudget(job(10, OWNER, 'OPEN'), 1000, 3000),
                fromDateOnly('2026-05-01'),
            ),
            withDeadline(
                withBudget(job(11, OWNER, 'OPEN'), 1000, 3000),
                fromDateOnly('2026-05-01'),
            ),
            withDeadline(
                withBudget(job(12, OWNER, 'OPEN'), 5000, 8000),
                fromDateOnly('2026-05-01'),
            ),
        ];

        const page1 = await list(OTHER, {
            maxBudget: '4000',
            deadline: '2026-05-10',
            page: '1',
            pageSize: '1',
        });

        assert.equal(page1.items.length, 1);
        assert.equal(page1.items[0]?.jobId, 11);
        assert.equal(page1.pagination.totalItems, 2);
        assert.equal(page1.pagination.totalPages, 2);
    });
});

describe('POST /jobs/:jobId/close', () => {
    function close(callerCompanyId: number, jobId: number) {
        return call(controller.closeJob, callerCompanyId, {
            params: { jobId: String(jobId) },
        });
    }

    it('closes the job and rejects its pending proposals', async () => {
        rows = [job(1, OWNER, 'OPEN'), job(2, OWNER, 'OPEN')];
        proposals = [
            { listingId: 1, proposalStatus: 'PENDING' },
            { listingId: 1, proposalStatus: 'REJECTED' },
            // Another job's proposal is not touched.
            { listingId: 2, proposalStatus: 'PENDING' },
        ];

        const result = (await close(OWNER, 1)) as Job;

        assert.equal(result.listingStatus, 'CLOSED');
        assert.deepEqual(
            proposals.map((p) => p.proposalStatus),
            ['REJECTED', 'REJECTED', 'PENDING'],
        );
    });

    it("is 403 on another company's job and changes nothing", async () => {
        rows = [job(1, OWNER, 'OPEN')];
        proposals = [{ listingId: 1, proposalStatus: 'PENDING' }];

        const result = await close(OTHER, 1);

        assert.ok(result instanceof ApiError, 'expected an ApiError');
        assert.equal(result.status, 403);
        assert.equal(rows[0]!.listingStatus, 'OPEN');
        assert.equal(proposals[0]!.proposalStatus, 'PENDING');
    });

    it('is 409 on a job that is already closed', async () => {
        rows = [job(1, OWNER, 'CLOSED')];

        const result = await close(OWNER, 1);

        assert.ok(result instanceof ApiError, 'expected an ApiError');
        assert.equal(result.status, 409);
    });
});
