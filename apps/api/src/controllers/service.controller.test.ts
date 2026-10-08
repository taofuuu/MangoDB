/*
 * Tests for GET /services/:listingId (getService in service.controller.ts).
 *
 * What they cover:
 * - Any company can read another company's OPEN service, and the answer
 *   carries the owner's name (companyName).
 * - The owner still reads its own service in any status, CLOSED included.
 * - Everything else is 404: another company's non-open service, a soft-deleted
 *   company's service (even an OPEN one), a job id, and an id that does not
 *   exist. A non-open service is private to its owner, so a 403 would tell the
 *   caller the id exists (docs/conventions.md: fold 403 into 404 when
 *   existence is private).
 *
 * How:
 * - The test calls the controller directly with a fake req and a fake res that
 *   records the JSON body. A thrown ApiError is the error answer
 *   (express-async-errors hands it to errorHandler in the real app).
 * - lib/prisma is replaced with mock.module before the controller loads, so no
 *   test touches the shared Supabase database. The fake keeps listing rows in
 *   an array and answers findUnique / findFirst by reading the `where` the
 *   controller sends. It understands only plain equals and a `company`
 *   relation filter. So the test checks what comes back, not which query ran.
 *
 * Run: npm test (in apps/api). Needs --experimental-test-module-mocks, which the
 * test script passes.
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import { ApiError } from '../lib/ApiError';
import type { ServiceListing } from '@mangodb/shared';

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
    listingCategory: { catId: number }[];
    service: null;
    company: { companyName: string; deletedAt: Date | null };
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

function service(
    listingId: number,
    companyId: number,
    listingStatus: Row['listingStatus'],
): Row {
    return {
        listingId,
        companyId,
        listingType: 'SERVICE',
        listingStatus,
        listingTitle: `Service ${listingId}`,
        listingDesc: 'desc',
        minBudget: 100,
        maxBudget: 1000,
        listingCategory: [{ catId: 7 }],
        service: null,
        company: companies[companyId]!,
    };
}

// Reads the small part of Prisma's `where` language the controller uses.
function matches(row: Record<string, unknown>, where: unknown): boolean {
    if (where === undefined) return true;
    return Object.entries(where as Record<string, unknown>).every(
        ([key, cond]) => {
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

type Args = { where?: unknown };

function find(args: Args): Row | null {
    return rows.find((r) => matches(r, args.where)) ?? null;
}

const fakePrisma = {
    listing: {
        findUnique: async (args: Args) => find(args),
        findFirst: async (args: Args) => find(args),
    },
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

// Runs getService as `callerCompanyId` and returns the JSON it sent, or the
// ApiError it threw.
async function getOne(
    callerCompanyId: number,
    listingId: number | string,
): Promise<unknown> {
    const req = {
        params: { listingId: String(listingId) },
        query: {},
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
        await controller.getService(req, res);
    } catch (err) {
        return err;
    }
    return body;
}

function assertNotFound(result: unknown): void {
    assert.ok(
        result instanceof ApiError,
        `expected an ApiError, got ${JSON.stringify(result)}`,
    );
    assert.equal(result.status, 404);
    assert.equal(result.code, 'NOT_FOUND');
}

describe('GET /services/:listingId', () => {
    it("lets another company read an open service, with the owner's name", async () => {
        rows = [service(10, OWNER, 'OPEN')];

        const body = (await getOne(OTHER, 10)) as ServiceListing;

        assert.equal(body.listingId, 10);
        assert.equal(body.listingStatus, 'OPEN');
        assert.equal(body.companyName, 'Owner Co');
        assert.deepEqual(body.categoryIds, [7]);
    });

    it('still shows the owner its own closed service', async () => {
        rows = [service(10, OWNER, 'CLOSED')];

        const body = (await getOne(OWNER, 10)) as ServiceListing;

        assert.equal(body.listingId, 10);
        assert.equal(body.listingStatus, 'CLOSED');
        assert.equal(body.companyName, 'Owner Co');
    });

    it("answers 404, not 403, for another company's closed service", async () => {
        rows = [service(10, OWNER, 'CLOSED')];

        assertNotFound(await getOne(OTHER, 10));
    });

    it("answers 404 for a deleted company's service, even an open one", async () => {
        rows = [service(30, GONE, 'OPEN')];

        assertNotFound(await getOne(OTHER, 30));
    });

    it('answers 404 for a job id', async () => {
        rows = [{ ...service(10, OWNER, 'OPEN'), listingType: 'JOB' }];

        assertNotFound(await getOne(OWNER, 10));
    });

    it('answers 404 for an id that does not exist', async () => {
        rows = [service(10, OWNER, 'OPEN')];

        assertNotFound(await getOne(OTHER, 99));
    });

    // A malformed id is a bad request, not a missing row (docs/conventions.md,
    // status codes). 1.5 is a number, so a plain isNaN check would let it
    // through to the Int column.
    for (const badId of ['abc', '1.5']) {
        it(`answers 400 for the malformed id "${badId}"`, async () => {
            rows = [service(1, OWNER, 'OPEN')];

            const result = await getOne(OTHER, badId);

            assert.ok(
                result instanceof ApiError,
                `expected an ApiError, got ${JSON.stringify(result)}`,
            );
            assert.equal(result.status, 400);
            assert.equal(result.code, 'BAD_REQUEST');
        });
    }
});
