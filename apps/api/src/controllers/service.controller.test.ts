/*
 * Tests for the ?companyId= filter and ?orderBy=ratingDesc|ratingAsc sort on
 * GET /services (listServices in service.controller.ts), and for
 * DELETE /services/:serviceId (deleteService): pending hire requests are
 * rejected with a notice, and the rejection notices keep the title (#264).
 *
 * What they cover:
 * - ?companyId= narrows the search to one company's services.
 * - The search's usual rules still hold under the filter: only OPEN services,
 *   and none from a soft-deleted company. So asking for a deleted company
 *   gives an empty page, not an error.
 * - Without ?companyId=, or with a blank one (empty or only spaces), every
 *   company's open services still come back. A blank box in the UI means no
 *   filter, same as a blank ?maxPrice=.
 * - Anything else that is not plain digits for a positive int4 is a 400. That
 *   includes "0x10" and "1e3", which Number() alone would read as 16 and 1000.
 * - ?orderBy=ratingDesc|ratingAsc sorts by the Provider's averageRating via
 *   getRating, with unrated Providers last in both directions, and paginates
 *   after sorting.
 *
 * How:
 * - The test calls the controller directly with a fake req and a fake res that
 *   records the JSON body. A thrown ApiError is the error answer
 *   (Express 5 hands a rejected handler's error to errorHandler in the real app).
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
import type { Paginated, ServiceSummary } from '@mangodb/shared';
import { ApiError } from '../lib/api-error';
import type { RatingSource, ReviewScoresRow } from '../lib/rating';

type Company = {
    companyId: number;
    companyName: string;
    companyPhoto: string | null;
    deletedAt: Date | null;
} & RatingSource;

// One listing row as the database would hold it, with its relations joined in.
type Row = {
    listingId: number;
    companyId: number;
    listingType: 'JOB' | 'SERVICE';
    listingStatus: 'OPEN' | 'CLOSED';
    listingTitle: string;
    minBudget: number | null;
    maxBudget: number | null;
    listingCategory: { category: { categoryName: string } }[];
    service: null;
    company: Company;
};

const ALPHA = 1;
const BETA = 2;
const GONE = 3; // a soft-deleted company
const GAMMA = 4;
const DELTA = 5;

function reviewRow(
    scores:
        | number
        | [
              workQuality: number,
              service: number,
              valueForMoney: number,
              deliveryTime: number,
          ],
): ReviewScoresRow {
    const [
        workQualityScore,
        serviceScore,
        valueForMoneyScore,
        deliveryTimeScore,
    ] = typeof scores === 'number' ? [scores, scores, scores, scores] : scores;
    return {
        project: {
            review: {
                workQualityScore,
                serviceScore,
                valueForMoneyScore,
                deliveryTimeScore,
            },
        },
    };
}

function company(
    companyId: number,
    deletedAt: Date | null = null,
    ratingSource: RatingSource = { proposal: [], listing: [] },
): Company {
    return {
        companyId,
        companyName: `Company ${companyId}`,
        companyPhoto: null,
        deletedAt,
        ...ratingSource,
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
    companyOverride?: Company,
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
        company: companyOverride ?? companies[companyId]!,
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

// deleteService's writes, in order, as [model.method, args].
let writes: [string, unknown][] = [];
let projectCount = 0;
// What tx.listing.findUniqueOrThrow does: answer a title, or throw P2025.
let listingGone = false;

function record(name: string, answer: unknown = { count: 1 }) {
    return async (args: unknown) => {
        writes.push([name, args]);
        return answer;
    };
}

const fakeTx = {
    listing: {
        findUniqueOrThrow: async () => {
            if (listingGone)
                throw Object.assign(new Error(), { code: 'P2025' });
            return { listingTitle: 'Logo design' };
        },
        delete: record('listing.delete'),
    },
    proposal: {
        updateManyAndReturn: record('proposal.updateManyAndReturn', [
            { proposalId: 40, senderId: BETA },
        ]),
    },
    notification: {
        createMany: record('notification.createMany'),
        deleteMany: record('notification.deleteMany'),
        updateMany: record('notification.updateMany'),
    },
};

const fakePrisma = {
    listing: {
        count: async (args: Args) =>
            rows.filter((r) => matches(r, args.where)).length,
        // Paging and order are not under test here; every match comes back.
        findMany: async (args: Args) =>
            rows.filter((r) => matches(r, args.where)),
        findUnique: async (args: { where: { listingId: number } }) =>
            rows.find((r) => r.listingId === args.where.listingId) ?? null,
    },
    project: { count: async () => projectCount },
    servicePortfolio: { findMany: async () => [] },
    // The search passes an array, the delete a function.
    $transaction: (
        work: Promise<unknown>[] | ((tx: unknown) => Promise<unknown>),
    ) => (typeof work === 'function' ? work(fakeTx) : Promise.all(work)),
};

function moduleUrl(specifier: string): string {
    return pathToFileURL(require.resolve(specifier)).href;
}

let controller: typeof import('./service.controller.js');

before(async () => {
    mock.module(moduleUrl('../lib/prisma'), {
        namedExports: { prisma: fakePrisma },
    });
    // lib/storage loads env.ts, which throws without a JWT_SECRET. The search
    // never touches storage, so a stub keeps the test free of app secrets.
    mock.module(moduleUrl('../lib/storage'), {
        namedExports: {
            BUCKETS: { PORTFOLIO: 'portfolio' },
            removeFromStorageByUrl: async () => undefined,
        },
    });
    controller = await import('./service.controller.js');
});

beforeEach(() => {
    rows = [];
    writes = [];
    projectCount = 0;
    listingGone = false;
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
    const body = result as Paginated<ServiceSummary>;
    assert.ok(
        Array.isArray(body.items),
        `no items in ${JSON.stringify(result)}`,
    );
    return body.items.map((s) => s.serviceId).sort((a, b) => a - b);
}

function orderedIds(result: unknown): number[] {
    const body = result as Paginated<ServiceSummary>;
    assert.ok(
        Array.isArray(body.items),
        `no items in ${JSON.stringify(result)}`,
    );
    return body.items.map((s) => s.serviceId);
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
        assert.equal(
            (result as Paginated<ServiceSummary>).pagination.totalItems,
            2,
        );
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

    // Same rule as a blank ?maxPrice= in this schema: an empty box in the UI
    // means no filter.
    for (const blank of ['', '   ']) {
        it(`lists every company when companyId=${JSON.stringify(blank)}`, async () => {
            rows = [service(10, ALPHA), service(20, BETA)];

            assert.deepEqual(ids(await search({ companyId: blank })), [10, 20]);
        });
    }

    for (const bad of ['abc', '0', '-1', '1.5', '0x10', '1e3', '2147483648']) {
        it(`answers 400 for companyId=${JSON.stringify(bad)}`, async () => {
            rows = [service(10, ALPHA)];

            assertBadRequest(await search({ companyId: bad }));
        });
    }
});

describe('GET /services?orderBy=ratingDesc|ratingAsc (US3-3)', () => {
    it('orders services by rating both ways, with unrated Providers last either way', async () => {
        const unrated = company(ALPHA);
        const ratedLow = company(BETA, null, {
            proposal: [reviewRow(2)],
            listing: [],
        });
        const ratedHigh = company(GAMMA, null, {
            proposal: [reviewRow(5)],
            listing: [],
        });
        const ratedMid = company(DELTA, null, {
            proposal: [],
            listing: [{ proposal: [reviewRow([4, 3, 4, 3])] }], // average 3.5
        });

        rows = [
            service(10, ALPHA, 'OPEN', unrated),
            service(20, BETA, 'OPEN', ratedLow),
            service(30, GAMMA, 'OPEN', ratedHigh),
            service(40, DELTA, 'OPEN', ratedMid),
        ];

        assert.deepEqual(
            orderedIds(await search({ orderBy: 'ratingDesc' })),
            [30, 40, 20, 10],
        );
        assert.deepEqual(
            orderedIds(await search({ orderBy: 'ratingAsc' })),
            [20, 40, 30, 10],
        );
    });

    it('combines job proposal reviews and service hire request reviews via getRating', async () => {
        // Combined average: (5 + 3) / 2 = 4.0
        const combined = company(ALPHA, null, {
            proposal: [reviewRow(5)],
            listing: [{ proposal: [reviewRow(3)] }],
        });
        // Single review: 4.5
        const higher = company(BETA, null, {
            proposal: [reviewRow([5, 4, 5, 4])],
            listing: [],
        });

        rows = [
            service(10, ALPHA, 'OPEN', combined),
            service(20, BETA, 'OPEN', higher),
        ];

        const descResult = (await search({
            orderBy: 'ratingDesc',
        })) as Paginated<ServiceSummary>;
        assert.deepEqual(orderedIds(descResult), [20, 10]);
        assert.deepEqual(
            descResult.items.map(
                ({ serviceId, averageRating, ratingCount }) => ({
                    serviceId,
                    averageRating,
                    ratingCount,
                }),
            ),
            [
                { serviceId: 20, averageRating: 4.5, ratingCount: 1 },
                { serviceId: 10, averageRating: 4, ratingCount: 2 },
            ],
        );
        assert.deepEqual(
            orderedIds(await search({ orderBy: 'ratingAsc' })),
            [10, 20],
        );
    });

    it("keeps the database's order when ratings tie, and among unrated Providers", async () => {
        const tiedA = company(ALPHA, null, {
            proposal: [reviewRow(4)],
            listing: [],
        });
        const tiedB = company(BETA, null, {
            proposal: [reviewRow(4)],
            listing: [],
        });
        const unratedA = company(GAMMA);
        const unratedB = company(DELTA);

        rows = [
            service(40, GAMMA, 'OPEN', unratedA),
            service(30, ALPHA, 'OPEN', tiedA),
            service(20, DELTA, 'OPEN', unratedB),
            service(10, BETA, 'OPEN', tiedB),
        ];

        assert.deepEqual(
            orderedIds(await search({ orderBy: 'ratingDesc' })),
            [30, 10, 40, 20],
        );
        assert.deepEqual(
            orderedIds(await search({ orderBy: 'ratingAsc' })),
            [30, 10, 40, 20],
        );
    });

    it('paginates after sorting by rating', async () => {
        const rated5 = company(ALPHA, null, {
            proposal: [reviewRow(5)],
            listing: [],
        });
        const rated3 = company(BETA, null, {
            proposal: [reviewRow(3)],
            listing: [],
        });
        const unrated = company(GAMMA);

        rows = [
            service(10, GAMMA, 'OPEN', unrated),
            service(20, BETA, 'OPEN', rated3),
            service(30, ALPHA, 'OPEN', rated5),
        ];

        const page1 = (await search({
            orderBy: 'ratingDesc',
            page: '1',
            pageSize: '2',
        })) as Paginated<ServiceSummary>;
        assert.deepEqual(orderedIds(page1), [30, 20]);
        assert.deepEqual(page1.pagination, {
            page: 1,
            pageSize: 2,
            totalItems: 3,
            totalPages: 2,
        });

        const page2 = (await search({
            orderBy: 'ratingDesc',
            page: '2',
            pageSize: '2',
        })) as Paginated<ServiceSummary>;
        assert.deepEqual(orderedIds(page2), [10]);
        assert.deepEqual(page2.pagination, {
            page: 2,
            pageSize: 2,
            totalItems: 3,
            totalPages: 2,
        });
    });
});

// Runs deleteService on service 10 as its owner, ALPHA, and returns the status
// it answered, or the ApiError it threw.
async function deleteTen(): Promise<unknown> {
    const req = {
        params: { serviceId: '10' },
        auth: { companyId: ALPHA, role: 'provider', jti: 'j' },
    } as unknown as Request;
    let status = 0;
    const res = {
        status(code: number) {
            status = code;
            return this;
        },
        end() {
            return this;
        },
    } as unknown as Response;
    try {
        await controller.deleteService(req, res);
    } catch (err) {
        return err;
    }
    return status;
}

describe('DELETE /services/:serviceId (#264)', () => {
    it('rejects pending hire requests and keeps the rejection notices', async () => {
        rows = [service(10, ALPHA)];

        assert.equal(await deleteTen(), 204);
        const onThisService = { proposal: { listingId: 10 } };
        assert.deepEqual(writes, [
            [
                'proposal.updateManyAndReturn',
                {
                    where: { listingId: 10, proposalStatus: 'PENDING' },
                    data: { proposalStatus: 'REJECTED' },
                    select: { proposalId: true, senderId: true },
                },
            ],
            [
                'notification.createMany',
                {
                    data: [
                        {
                            proposalId: 40,
                            senderId: ALPHA,
                            recipientId: BETA,
                            notificationType: 'PROPOSAL_REJECTED',
                        },
                    ],
                },
            ],
            // The Provider's own notices go.
            [
                'notification.deleteMany',
                {
                    where: {
                        ...onThisService,
                        notificationType: { not: 'PROPOSAL_REJECTED' },
                    },
                },
            ],
            // The rest keep the title, before the delete nulls proposalId.
            [
                'notification.updateMany',
                {
                    where: onThisService,
                    data: {
                        listingTitle: 'Logo design',
                        listingType: 'SERVICE',
                    },
                },
            ],
            [
                'listing.delete',
                {
                    where: {
                        listingId: 10,
                        companyId: ALPHA,
                        listingType: 'SERVICE',
                    },
                },
            ],
        ]);
    });

    it('refuses a service with a project, before any write', async () => {
        rows = [service(10, ALPHA)];
        projectCount = 1;

        const result = await deleteTen();
        assert.ok(result instanceof ApiError);
        assert.equal(result.status, 409);
        assert.deepEqual(writes, []);
    });

    it('answers 404 when the service went before the transaction', async () => {
        rows = [service(10, ALPHA)];
        listingGone = true;

        const result = await deleteTen();
        assert.ok(result instanceof ApiError);
        assert.equal(result.status, 404);
        assert.deepEqual(writes, []);
    });
});
