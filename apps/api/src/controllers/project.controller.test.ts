/*
 * Tests for POST /projects/:projectId/updates (createProjectUpdate, US4-10)
 * and POST /projects/:projectId/confirm-deposit (confirmDeposit, US4-7).
 *
 * What they cover:
 * - T4.10.3: a saved update has its date and time, set by the server. The
 *   client cannot send one: an extra createdAt field is a 400.
 * - T4.10.4: only the project's Provider can add one. The Receiver gets 403,
 *   a company outside the project 404, and neither writes anything. A
 *   project that is not IN_PROGRESS is a 409.
 * - T4.7.3: the Provider confirming a reported deposit moves the project to
 *   IN_PROGRESS and stamps depositConfirmedAt.
 * - T4.7.4: confirming before the Receiver reported the deposit is a 409, and
 *   the Receiver confirming is a 403. Neither changes the project.
 *
 * How:
 * - The test calls the controller function directly with a fake req and a
 *   fake res that records the status and JSON body.
 * - lib/prisma is replaced with mock.module before the controller loads, so no
 *   test touches the shared Supabase database. project.findUnique hands back
 *   `project`; projectUpdate.create keeps what it was given in `created` and
 *   stamps createdAt the way the column's default now() does.
 * - project.updateMany and project.update change `project` in place, honouring
 *   their where filters. $transaction puts `project` back if its work throws,
 *   as the database's rollback would.
 *
 * Run: npm test (in apps/api).
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import type { Project, ProjectUpdate } from '@mangodb/shared';
import { ApiError } from '../lib/api-error';

// On a job the sender is the Provider and the owner the Receiver (ADR 0016).
const PROVIDER = 3;
const RECEIVER = 9;
const OUTSIDER = 42;

let project = projectIn('IN_PROGRESS');
let created: Record<string, unknown>[] = [];

const fakePrisma = {
    $transaction: async (work: (tx: unknown) => Promise<unknown>) => {
        const saved = structuredClone(project);
        try {
            return await work(fakePrisma);
        } catch (err) {
            project = saved;
            throw err;
        }
    },
    project: {
        findUnique: () => Promise.resolve(project),
        // moveProjectStatus: moves only a project still in the `from` status.
        updateMany: ({
            where,
            data,
        }: {
            where: { projectStatus: string };
            data: { projectStatus: string };
        }) => {
            if (project.projectStatus !== where.projectStatus) {
                return Promise.resolve({ count: 0 });
            }
            project.projectStatus = data.projectStatus;
            return Promise.resolve({ count: 1 });
        },
        // A where that misses the row is P2025 in Prisma.
        update: ({
            where,
            data,
        }: {
            where: { depositReportedAt?: unknown };
            data: { depositConfirmedAt: Date };
        }) => {
            if (where.depositReportedAt && project.depositReportedAt === null) {
                return Promise.reject(
                    Object.assign(new Error('Record not found'), {
                        code: 'P2025',
                    }),
                );
            }
            project.depositConfirmedAt = data.depositConfirmedAt;
            return Promise.resolve(project);
        },
    },
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
});

function projectIn(
    projectStatus: string,
    depositReportedAt: Date | null = null,
) {
    return {
        projectId: 1,
        proposalId: 1,
        totalBudget: 5000,
        startDate: new Date('2026-10-20T00:00:00.000Z'),
        projectStatus,
        depositReportedAt,
        depositConfirmedAt: null as Date | null,
        completedAt: null,
        proposal: {
            senderId: PROVIDER,
            listing: { listingType: 'JOB', companyId: RECEIVER },
        },
    };
}

type Handler = (req: Request, res: Response) => Promise<void>;

// Calls handler on project 1 as callerId. Returns the status and JSON it
// answered with, or the ApiError it threw.
async function call(
    handler: Handler,
    callerId: number,
    body?: unknown,
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
        await handler(req, res);
    } catch (err) {
        return err;
    }
    return { status, body: json };
}

function postUpdate(
    callerId: number,
    body: unknown = { updateText: 'Wireframes done' },
): Promise<unknown> {
    return call(controller.createProjectUpdate, callerId, body);
}

function confirmDeposit(callerId: number): Promise<unknown> {
    return call(controller.confirmDeposit, callerId);
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

describe('POST /projects/:projectId/confirm-deposit', () => {
    beforeEach(() => {
        project = projectIn(
            'AWAITING_DEPOSIT',
            new Date('2026-10-22T09:00:00.000Z'),
        );
    });

    it('moves the project to IN_PROGRESS (T4.7.3)', async () => {
        const startedAt = Date.now();
        const result = (await confirmDeposit(PROVIDER)) as {
            status: number;
            body: Project;
        };

        assert.equal(result.status, 200);
        assert.equal(result.body.projectStatus, 'IN_PROGRESS');
        const confirmedAt = Date.parse(result.body.depositConfirmedAt!);
        assert.ok(confirmedAt >= startedAt && confirmedAt <= Date.now());
        assert.equal(project.projectStatus, 'IN_PROGRESS');
    });

    it('is a 409 before the Receiver reports it (T4.7.4)', async () => {
        project = projectIn('AWAITING_DEPOSIT');
        assert.ok(isApiError(409)(await confirmDeposit(PROVIDER)));
        // The status move rolls back with the refused stamp.
        assert.equal(project.projectStatus, 'AWAITING_DEPOSIT');
        assert.equal(project.depositConfirmedAt, null);
    });

    it('is a 403 for the Receiver and changes nothing (T4.7.4)', async () => {
        assert.ok(isApiError(403)(await confirmDeposit(RECEIVER)));
        assert.equal(project.projectStatus, 'AWAITING_DEPOSIT');
        assert.equal(project.depositConfirmedAt, null);
    });
});
