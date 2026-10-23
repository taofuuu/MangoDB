/*
 * Tests for project.controller.ts:
 * - POST /projects/:projectId/updates (createProjectUpdate, US4-10).
 * - POST /projects/:projectId/review (createReview, US5-1, ADR 0018).
 *
 * What they cover:
 * - T4.10.3: a saved update has its date and time, set by the server. The
 *   client cannot send one: an extra createdAt field is a 400.
 * - T4.10.4: only the project's Provider can add one. The Receiver gets 403,
 *   a company outside the project 404, and neither writes anything. A
 *   project that is not IN_PROGRESS is a 409.
 * - US5-1: the Receiver reviews a COMPLETED project once: 201 Created with Review DTO.
 * - Both Job (owner is Receiver) and Service (sender is Receiver) paths.
 * - An optional comment up to 500 characters, or null/omitted comment.
 * - 404 for an unknown project or a caller outside the project.
 * - 403 when the Provider attempts to review.
 * - 409 when the project is not COMPLETED.
 * - 409 when the project has already been reviewed (duplicate review / P2002).
 * - 400 when scores are invalid (<1, >5, non-integer) or comment exceeds 500 chars.
 *
 * How:
 * - The test calls the controller function directly with a fake req and a
 *   fake res that records the status and JSON body.
 * - lib/prisma is replaced with mock.module before the controller loads, so no
 *   test touches the shared Supabase database. project.findUnique hands back
 *   `project`; projectUpdate.create and review.create record writes and simulate
 *   database constraints.
 *
 * Run: npm test (in apps/api).
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import type { ProjectUpdate, Review } from '@mangodb/shared';
import { ApiError } from '../lib/api-error';

// On a job the sender is the Provider and the owner the Receiver (ADR 0016).
const PROVIDER = 3;
const RECEIVER = 9;
const OUTSIDER = 42;

let project: unknown = null;
let created: Record<string, unknown>[] = [];
let createdReviews: Record<string, unknown>[] = [];
let reviewAlreadyExists = false;

const fakePrisma = {
    project: { findUnique: () => Promise.resolve(project) },
    projectUpdate: {
        create: ({ data }: { data: Record<string, unknown> }) => {
            created.push(data);
            return Promise.resolve({
                projectUpdateId: created.length,
                ...data,
                createdAt: new Date(),
            });
        },
    },
    review: {
        findUnique: ({ where }: { where: { projectId: number } }) => {
            const found = createdReviews.find(
                (r) => (r.projectId as number) === where.projectId,
            );
            if (!found) return Promise.resolve(null);
            return Promise.resolve({
                reviewId: 1,
                ...found,
                createdAt: new Date('2026-10-23T12:00:00.000Z'),
            });
        },
        create: ({ data }: { data: Record<string, unknown> }) => {
            if (reviewAlreadyExists) {
                const err = new Error(
                    'Unique constraint failed on the fields: (proj_id)',
                );
                (err as unknown as { code: string }).code = 'P2002';
                throw err;
            }
            reviewAlreadyExists = true;
            createdReviews.push(data);
            return Promise.resolve({
                reviewId: createdReviews.length,
                ...data,
                createdAt: new Date('2026-10-23T12:00:00.000Z'),
            });
        },
    },
};

function moduleUrl(specifier: string): string {
    return pathToFileURL(require.resolve(specifier)).href;
}

let controller: typeof import('./project.controller.js');

before(async () => {
    mock.module(moduleUrl('../lib/prisma'), {
        namedExports: { prisma: fakePrisma },
    });
    controller = await import('./project.controller.js');
});

beforeEach(() => {
    project = projectIn('IN_PROGRESS');
    created = [];
    createdReviews = [];
    reviewAlreadyExists = false;
});

function projectIn(projectStatus: string) {
    return {
        projectStatus,
        proposal: {
            senderId: PROVIDER,
            listing: { listingType: 'JOB', companyId: RECEIVER },
        },
    };
}

function projectOnService(projectStatus: string) {
    return {
        projectStatus,
        proposal: {
            senderId: RECEIVER,
            listing: { listingType: 'SERVICE', companyId: PROVIDER },
        },
    };
}

// Posts to project 1 as callerId. Returns the status and JSON it answered
// with, or the ApiError it threw.
async function postUpdate(
    callerId: number,
    body: unknown = { updateText: 'Wireframes done' },
): Promise<unknown> {
    const req = {
        auth: { companyId: callerId },
        params: { projectId: '1' },
        body,
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
        await controller.createProjectUpdate(req, res);
    } catch (err) {
        return err;
    }
    return { status, body: json as ProjectUpdate };
}

async function postReview(
    callerId: number,
    body: unknown = {
        workQualityScore: 5,
        serviceScore: 4,
        valueForMoneyScore: 4,
        deliveryTimeScore: 5,
        comment: 'Delivered top-notch quality!',
    },
): Promise<unknown> {
    const req = {
        auth: { companyId: callerId },
        params: { projectId: '1' },
        body,
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
        await controller.createReview(req, res);
    } catch (err) {
        return err;
    }
    return { status, body: json as Review };
}

async function getProjectReview(callerId: number): Promise<unknown> {
    const req = {
        auth: { companyId: callerId },
        params: { projectId: '1' },
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
        await controller.getProjectReview(req, res);
    } catch (err) {
        return err;
    }
    return { status, body: json as Review };
}

function isApiError(status: number) {
    return (err: unknown) => err instanceof ApiError && err.status === status;
}

describe('POST /projects/:projectId/updates', () => {
    it('saves a PROGRESS update with its date and time (T4.10.3)', async () => {
        const startedAt = Date.now();
        const result = (await postUpdate(PROVIDER)) as {
            status: number;
            body: ProjectUpdate;
        };

        assert.equal(result.status, 201);
        assert.equal(result.body.updateType, 'PROGRESS');
        assert.equal(result.body.updateText, 'Wireframes done');
        const savedAt = Date.parse(result.body.createdAt);
        assert.ok(savedAt >= startedAt && savedAt <= Date.now());
        // The time comes from the database default, not from the request.
        assert.equal(created.length, 1);
        assert.ok(!('createdAt' in created[0]!));
    });

    it('refuses a createdAt sent by the client', async () => {
        const result = await postUpdate(PROVIDER, {
            updateText: 'Backdated',
            createdAt: '2020-01-01T00:00:00.000Z',
        });
        assert.ok(isApiError(400)(result));
        assert.equal(created.length, 0);
    });

    it('is a 403 for the Receiver and writes nothing (T4.10.4)', async () => {
        assert.ok(isApiError(403)(await postUpdate(RECEIVER)));
        assert.equal(created.length, 0);
    });

    it('is a 404 for a company outside the project (T4.10.4)', async () => {
        assert.ok(isApiError(404)(await postUpdate(OUTSIDER)));
        assert.equal(created.length, 0);
    });

    it('is a 409 when the project is not IN_PROGRESS', async () => {
        project = projectIn('AWAITING_ACCEPTANCE');
        assert.ok(isApiError(409)(await postUpdate(PROVIDER)));
        assert.equal(created.length, 0);
    });
});

describe('POST /projects/:projectId/review', () => {
    beforeEach(() => {
        project = projectIn('COMPLETED');
    });

    it('creates a review on a completed job project by its receiver (201)', async () => {
        const result = (await postReview(RECEIVER)) as {
            status: number;
            body: Review;
        };

        assert.equal(result.status, 201);
        assert.equal(result.body.projectId, 1);
        assert.equal(result.body.workQualityScore, 5);
        assert.equal(result.body.serviceScore, 4);
        assert.equal(result.body.valueForMoneyScore, 4);
        assert.equal(result.body.deliveryTimeScore, 5);
        assert.equal(result.body.comment, 'Delivered top-notch quality!');
        assert.equal(result.body.createdAt, '2026-10-23T12:00:00.000Z');
        assert.equal(createdReviews.length, 1);
    });

    it('creates a review on a completed service project where sender is receiver (201)', async () => {
        project = projectOnService('COMPLETED');
        const result = (await postReview(RECEIVER, {
            workQualityScore: 4,
            serviceScore: 5,
            valueForMoneyScore: 3,
            deliveryTimeScore: 4,
        })) as {
            status: number;
            body: Review;
        };

        assert.equal(result.status, 201);
        assert.equal(result.body.projectId, 1);
        assert.equal(result.body.comment, null);
    });

    it('rejects an outsider with 404 Project not found', async () => {
        const result = await postReview(OUTSIDER);
        assert.ok(isApiError(404)(result));
        assert.equal(createdReviews.length, 0);
    });

    it('rejects an unknown project with 404 Project not found', async () => {
        project = null;
        const result = await postReview(RECEIVER);
        assert.ok(isApiError(404)(result));
        assert.equal(createdReviews.length, 0);
    });

    it('rejects the provider with 403 Only the Receiver can review the project', async () => {
        const result = await postReview(PROVIDER);
        assert.ok(isApiError(403)(result));
        assert.equal(createdReviews.length, 0);
    });

    it('rejects a non-COMPLETED project with 409 Project is not COMPLETED', async () => {
        project = projectIn('IN_PROGRESS');
        const result = await postReview(RECEIVER);
        assert.ok(isApiError(409)(result));
        assert.equal(createdReviews.length, 0);
    });

    it('rejects a second review on the same project with 409 Project has already been reviewed', async () => {
        reviewAlreadyExists = true;
        const result = await postReview(RECEIVER);
        assert.ok(isApiError(409)(result));
    });

    it('rejects invalid scores outside 1-5 with 400', async () => {
        const result = await postReview(RECEIVER, {
            workQualityScore: 6,
            serviceScore: 0,
            valueForMoneyScore: 3.5,
            deliveryTimeScore: 5,
        });
        assert.ok(isApiError(400)(result));
        assert.equal(createdReviews.length, 0);
    });

    it('rejects a comment longer than 500 characters with 400', async () => {
        const result = await postReview(RECEIVER, {
            workQualityScore: 5,
            serviceScore: 5,
            valueForMoneyScore: 5,
            deliveryTimeScore: 5,
            comment: 'a'.repeat(501),
        });
        assert.ok(isApiError(400)(result));
        assert.equal(createdReviews.length, 0);
    });
});

describe('GET /projects/:projectId/review', () => {
    it('returns the review for the Receiver (200)', async () => {
        project = projectIn('COMPLETED');
        await postReview(RECEIVER);

        const result = (await getProjectReview(RECEIVER)) as {
            status: number;
            body: Review;
        };

        assert.equal(result.status, 200);
        assert.equal(result.body.projectId, 1);
        assert.equal(result.body.workQualityScore, 5);
        assert.equal(result.body.comment, 'Delivered top-notch quality!');
    });

    it('returns the review for the Provider (200)', async () => {
        project = projectIn('COMPLETED');
        await postReview(RECEIVER);

        const result = (await getProjectReview(PROVIDER)) as {
            status: number;
            body: Review;
        };

        assert.equal(result.status, 200);
        assert.equal(result.body.projectId, 1);
        assert.equal(result.body.workQualityScore, 5);
    });

    it('answers 404 when the project has not been reviewed yet', async () => {
        project = projectIn('COMPLETED');
        const result = await getProjectReview(RECEIVER);
        assert.ok(isApiError(404)(result));
    });

    it('answers 404 for an outsider', async () => {
        project = projectIn('COMPLETED');
        await postReview(RECEIVER);
        const result = await getProjectReview(OUTSIDER);
        assert.ok(isApiError(404)(result));
    });

    it('answers 404 for an unknown project', async () => {
        project = null;
        const result = await getProjectReview(RECEIVER);
        assert.ok(isApiError(404)(result));
    });
});
