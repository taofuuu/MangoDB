/*
 * Tests for GET /companies/:companyId/reviews and
 * GET /companies/:companyId/reviews/summary (US5-2).
 *
 * Run: npm test (in apps/api).
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import type { CompanyReview, Paginated, ReviewSummary } from '@mangodb/shared';
import { ApiError } from '../lib/api-error';

type CompanyRow = {
    companyId: number;
    accountType: string;
    deletedAt: Date | null;
    proposal: {
        project: {
            review: {
                workQualityScore: number;
                serviceScore: number;
                valueForMoneyScore: number;
                deliveryTimeScore: number;
            } | null;
        } | null;
    }[];
    listing: {
        proposal: {
            project: {
                review: {
                    workQualityScore: number;
                    serviceScore: number;
                    valueForMoneyScore: number;
                    deliveryTimeScore: number;
                } | null;
            } | null;
        }[];
    }[];
};

let targetCompany: CompanyRow | null;
let reviewRows: unknown[];

const fakePrisma = {
    company: {
        findFirst: ({
            where,
        }: {
            where: {
                companyId: number;
                deletedAt: null;
                accountType?: { not: string };
            };
        }) => {
            if (!targetCompany) return Promise.resolve(null);
            if (targetCompany.companyId !== where.companyId) {
                return Promise.resolve(null);
            }
            if (targetCompany.deletedAt !== null) return Promise.resolve(null);
            if (
                where.accountType &&
                targetCompany.accountType === where.accountType.not
            ) {
                return Promise.resolve(null);
            }
            return Promise.resolve(targetCompany);
        },
    },
    review: {
        count: () => Promise.resolve(reviewRows.length),
        findMany: () => Promise.resolve(reviewRows),
    },
    $transaction: (promises: Promise<unknown>[]) => Promise.all(promises),
};

function moduleUrl(specifier: string): string {
    return pathToFileURL(require.resolve(specifier)).href;
}

let controller: typeof import('./company.controller.js');

before(async () => {
    mock.module(moduleUrl('../lib/prisma'), {
        namedExports: { prisma: fakePrisma },
    });
    // lib/storage and lib/session load env.ts, which throws without a
    // JWT_SECRET. The reviews controller endpoints never touch storage or
    // session minting, so stubs keep the test suite free of app secrets (CI).
    mock.module(moduleUrl('../lib/storage'), {
        namedExports: {
            BUCKETS: { PORTFOLIO: 'portfolio', AVATAR: 'avatar' },
            removeFromStorageByUrl: async () => undefined,
        },
    });
    mock.module(moduleUrl('../lib/session'), {
        namedExports: {
            sendSession: () => undefined,
        },
    });
    controller = await import('./company.controller.js');
});

beforeEach(() => {
    targetCompany = {
        companyId: 5,
        accountType: 'PROVIDER',
        deletedAt: null,
        proposal: [],
        listing: [],
    };
    reviewRows = [];
});

async function listReviews(
    companyId: string,
    query: Record<string, string> = {},
): Promise<unknown> {
    const req = {
        params: { companyId },
        query,
        auth: { companyId: 99, role: 'receiver' },
    } as unknown as Request;

    let status = 200;
    let json: unknown;
    const res = {
        status(code: number) {
            status = code;
            return this;
        },
        json(value: unknown) {
            json = value;
            return this;
        },
    } as unknown as Response;

    try {
        await controller.listProviderReviews(req, res);
    } catch (err) {
        return err;
    }
    return { status, body: json as Paginated<CompanyReview> };
}

async function getSummary(companyId: string): Promise<unknown> {
    const req = {
        params: { companyId },
        auth: { companyId: 99, role: 'receiver' },
    } as unknown as Request;

    let status = 200;
    let json: unknown;
    const res = {
        status(code: number) {
            status = code;
            return this;
        },
        json(value: unknown) {
            json = value;
            return this;
        },
    } as unknown as Response;

    try {
        await controller.getProviderReviewSummary(req, res);
    } catch (err) {
        return err;
    }
    return { status, body: json as ReviewSummary };
}

function isApiError(status: number) {
    return (err: unknown) => err instanceof ApiError && err.status === status;
}

describe('GET /companies/:companyId/reviews', () => {
    it('returns an empty list when the provider has no reviews', async () => {
        const result = (await listReviews('5')) as {
            status: number;
            body: Paginated<CompanyReview>;
        };

        assert.equal(result.status, 200);
        assert.deepEqual(result.body.items, []);
        assert.equal(result.body.pagination.totalItems, 0);
        assert.equal(result.body.pagination.page, 1);
    });

    it('returns paginated provider reviews mapped with the receiver', async () => {
        reviewRows = [
            {
                reviewId: 1,
                projectId: 10,
                workQualityScore: 5,
                serviceScore: 5,
                valueForMoneyScore: 4,
                deliveryTimeScore: 5,
                comment: 'Top quality work!',
                createdAt: new Date('2026-10-23T12:00:00.000Z'),
                project: {
                    proposal: {
                        senderId: 5,
                        sender: {
                            companyId: 5,
                            companyName: 'Provider Inc',
                            companyPhoto: null,
                        },
                        listing: {
                            listingType: 'JOB',
                            companyId: 2,
                            company: {
                                companyId: 2,
                                companyName: 'Job Owner Receiver',
                                companyPhoto: 'https://example.com/photo.png',
                            },
                        },
                    },
                },
            },
        ];

        const result = (await listReviews('5')) as {
            status: number;
            body: Paginated<CompanyReview>;
        };

        assert.equal(result.status, 200);
        assert.equal(result.body.items.length, 1);
        const [first] = result.body.items;
        assert.ok(first);
        assert.equal(first.reviewId, 1);
        assert.equal(first.workQualityScore, 5);
        assert.equal(first.comment, 'Top quality work!');
        assert.equal(first.receiver.companyName, 'Job Owner Receiver');
        assert.equal(result.body.pagination.totalItems, 1);
    });

    it('answers 404 for an unknown company', async () => {
        targetCompany = null;
        const result = await listReviews('999');
        assert.ok(isApiError(404)(result));
    });

    it('answers 404 for a soft-deleted company', async () => {
        targetCompany!.deletedAt = new Date();
        const result = await listReviews('5');
        assert.ok(isApiError(404)(result));
    });

    it('answers 404 for an admin company', async () => {
        targetCompany!.accountType = 'ADMIN';
        const result = await listReviews('5');
        assert.ok(isApiError(404)(result));
    });

    it('answers 400 for an invalid companyId', async () => {
        const result = await listReviews('abc');
        assert.ok(isApiError(400)(result));
    });
});

describe('GET /companies/:companyId/reviews/summary', () => {
    it('returns null average and 0 count when the provider has no reviews', async () => {
        const result = (await getSummary('5')) as {
            status: number;
            body: ReviewSummary;
        };

        assert.equal(result.status, 200);
        assert.deepEqual(result.body, { averageRating: null, ratingCount: 0 });
    });

    it('calculates average rating and count for completed reviews', async () => {
        targetCompany!.proposal = [
            {
                project: {
                    review: {
                        workQualityScore: 5,
                        serviceScore: 5,
                        valueForMoneyScore: 5,
                        deliveryTimeScore: 5,
                    },
                },
            },
        ];
        targetCompany!.listing = [
            {
                proposal: [
                    {
                        project: {
                            review: {
                                workQualityScore: 4,
                                serviceScore: 4,
                                valueForMoneyScore: 4,
                                deliveryTimeScore: 4,
                            },
                        },
                    },
                ],
            },
        ];

        const result = (await getSummary('5')) as {
            status: number;
            body: ReviewSummary;
        };

        assert.equal(result.status, 200);
        assert.deepEqual(result.body, { averageRating: 4.5, ratingCount: 2 });
    });

    it('answers 404 for an unknown company', async () => {
        targetCompany = null;
        const result = await getSummary('999');
        assert.ok(isApiError(404)(result));
    });

    it('answers 404 for a soft-deleted company', async () => {
        targetCompany!.deletedAt = new Date();
        const result = await getSummary('5');
        assert.ok(isApiError(404)(result));
    });

    it('answers 404 for an admin company', async () => {
        targetCompany!.accountType = 'ADMIN';
        const result = await getSummary('5');
        assert.ok(isApiError(404)(result));
    });

    it('answers 400 for an invalid companyId', async () => {
        const result = await getSummary('0');
        assert.ok(isApiError(400)(result));
    });
});
