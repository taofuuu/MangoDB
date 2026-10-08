/*
 * Tests for the ?companyId= filter on GET /services (listServices in
 * service.controller.ts).
 *
 * What they cover:
 * - ?companyId= narrows the search to one company's services.
 * - The search's usual rules still hold under the filter: only OPEN services,
 *   and none from a soft-deleted company. So asking for a deleted company
 *   gives an empty page, not an error.
 * - A companyId that is not a positive whole number is a 400.
 * - Without ?companyId= every company's open services still come back.
 *
 * How:
 * - The test calls the controller directly with a fake req and a fake res that
 *   records the JSON body. A thrown ApiError is the error answer
 *   (express-async-errors hands it to errorHandler in the real app).
 * - lib/prisma is replaced with mock.module before the controller loads, so no
 *   test touches the shared Supabase database. The fake keeps listing rows in
 *   an array and answers count / findMany by reading the `where` the
 *   controller sends. It understands only plain equals, an AND list and a
 *   `company` relation filter, and it throws on anything else. So the test
 *   checks which services come back, not which query ran.
 *
 * Run: npm test (in apps/api). Needs --experimental-test-module-mocks, which the
 * test script passes.
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import type { ServiceListResponse } from '@mangodb/shared';
import { ApiError } from '../lib/ApiError';

type Company = {
    companyId: number;
    companyName: string;
    companyPhoto: string | null;
    deletedAt: Date | null;
};

// One listing row as the database would hold it, with its relations joined in.
type Row = {
    listingId: number;
    companyId: number;
    listingType: 'JOB' | 'SERVICE';
    listingStatus: 'OPEN' | 'CLOSED';
    listingTitle: string;
    minBudget: number | null;
    maxBudget: number | null;
    listingCategory: { category: { catName: string } }[];
    service: null;
    company: Company;
};

const ALPHA = 1;
const BETA = 2;
const GONE = 3; // a soft-deleted company

function company(companyId: number, deletedAt: Date | null = null): Company {
    return {
        companyId,
        companyName: `Company ${companyId}`,
        companyPhoto: null,
        deletedAt,
    };
}

const companies: Record<number, Company> = {
    [ALPHA]: company(ALPHA),
    [BETA]: company(BETA),
    [GONE]: company(GONE, new Date('2026-01-01')),
};

let rows: Row[] = [];

function service(
    listingId: number,
    companyId: number,
    listingStatus: Row['listingStatus'] = 'OPEN',
): Row {
    return {
        listingId,
        companyId,
        listingType: 'SERVICE',
        listingStatus,
        listingTitle: `Service ${listingId}`,
        minBudget: null,
        maxBudget: null,
        listingCategory: [],
        service: null,
        company: companies[companyId]!,
    };
}

// Reads the small part of Prisma's `where` language the search uses when no
// keyword or other filter is sent.
function matches(row: Record<string, unknown>, where: unknown): boolean {
    return Object.entries(where as Record<string, unknown>).every(
        ([key, cond]) => {
            if (key === 'AND') {
                return (cond as unknown[]).every((c) => matches(row, c));
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
                throw new Error(`fake prisma: unsupported filter on ${key}`);
            }
            return value === cond;
        },
    );
}

type Args = { where: unknown };

const fakePrisma = {
    listing: {
        count: async (args: Args) =>
            rows.filter((r) => matches(r, args.where)).length,
        // Paging and order are not under test here; every match comes back.
        findMany: async (args: Args) =>
            rows.filter((r) => matches(r, args.where)),
    },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
};

function moduleUrl(specifier: string): string {
    return pathToFileURL(require.resolve(specifier)).href;
}

let controller: typeof import('./service.controller.js');

before(async () => {
    mock.module(moduleUrl('../lib/prisma'), {
        namedExports: { prisma: fakePrisma },
    });
    controller = await import('./service.controller.js');
});

beforeEach(() => {
    rows = [];
});

// Runs listServices with this query string's values and returns the JSON it
// sent, or the ApiError it threw.
async function search(query: Record<string, string>): Promise<unknown> {
    const req = {
        query,
        auth: { companyId: BETA, role: 'receiver', jti: 'j' },
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
        await controller.listServices(req, res);
    } catch (err) {
        return err;
    }
    return body;
}

function ids(result: unknown): number[] {
    const body = result as ServiceListResponse;
    assert.ok(
        Array.isArray(body.items),
        `no items in ${JSON.stringify(result)}`,
    );
    return body.items.map((s) => s.listingId).sort((a, b) => a - b);
}

function assertBadRequest(result: unknown): void {
    assert.ok(
        result instanceof ApiError,
        `expected an ApiError, got ${JSON.stringify(result)}`,
    );
    assert.equal(result.status, 400);
}

describe('GET /services?companyId=', () => {
    it("lists only that company's services", async () => {
        rows = [service(10, ALPHA), service(11, ALPHA), service(20, BETA)];

        const result = await search({ companyId: String(ALPHA) });

        assert.deepEqual(ids(result), [10, 11]);
        assert.equal((result as ServiceListResponse).pagination.totalItems, 2);
    });

    it("still hides that company's closed services", async () => {
        rows = [service(10, ALPHA), service(11, ALPHA, 'CLOSED')];

        assert.deepEqual(ids(await search({ companyId: String(ALPHA) })), [10]);
    });

    it('gives an empty page, not an error, for a deleted company', async () => {
        rows = [service(30, GONE), service(10, ALPHA)];

        assert.deepEqual(ids(await search({ companyId: String(GONE) })), []);
    });

    it('lists every company when companyId is not sent', async () => {
        rows = [service(10, ALPHA), service(20, BETA), service(30, GONE)];

        assert.deepEqual(ids(await search({})), [10, 20]);
    });

    // Same as a blank ?maxPrice= here and a blank ?companyId= on
    // GET /job-postings: an empty box in the UI means no filter.
    it('lists every company when companyId is blank', async () => {
        rows = [service(10, ALPHA), service(20, BETA)];

        assert.deepEqual(ids(await search({ companyId: '' })), [10, 20]);
    });

    for (const bad of ['abc', '0', '-1', '1.5', ' ', '2147483648']) {
        it(`answers 400 for companyId=${JSON.stringify(bad)}`, async () => {
            rows = [service(10, ALPHA)];

            assertBadRequest(await search({ companyId: bad }));
        });
    }
});
