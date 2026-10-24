/*
 * Tests for POST /projects/:projectId/updates (createProjectUpdate, US4-10).
 *
 * What they cover:
 * - T4.10.3: a saved update has its date and time, set by the server. The
 *   client cannot send one: an extra createdAt field is a 400.
 * - T4.10.4: only the project's Provider can add one. The Receiver gets 403,
 *   a company outside the project 404, and neither writes anything. A
 *   project that is not IN_PROGRESS is a 409.
 *
 * How:
 * - The test calls the controller function directly with a fake req and a
 *   fake res that records the status and JSON body.
 * - lib/prisma is replaced with mock.module before the controller loads, so no
 *   test touches the shared Supabase database. project.findUnique hands back
 *   `project`; projectUpdate.create keeps what it was given in `created` and
 *   stamps createdAt the way the column's default now() does.
 *
 * Run: npm test (in apps/api).
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import type { ProjectUpdate } from '@mangodb/shared';
import { ApiError } from '../lib/api-error';

// On a job the sender is the Provider and the owner the Receiver (ADR 0016).
const PROVIDER = 3;
const RECEIVER = 9;
const OUTSIDER = 42;

let project: unknown = null;
let created: Record<string, unknown>[] = [];

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

function projectIn(projectStatus: string) {
    return {
        projectStatus,
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
