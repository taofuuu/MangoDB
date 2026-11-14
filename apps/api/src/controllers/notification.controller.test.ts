/*
 * Tests for the navbar bell's endpoints (T4.1.5, ADR 0017):
 * - GET /notifications/mine (listMyNotifications)
 * - POST /notifications/mine/read (markMyNotificationsRead)
 *
 * What they cover:
 * - The list asks only for the caller's notices, newest first with the id
 *   breaking a tie, 20 at most, and maps each row to the DTO: projectId is
 *   null before the proposal became a project, and set after.
 * - Mark-read touches only the caller's unread notices and answers 204.
 *
 * How: lib/prisma is replaced with mock.module before the controller loads.
 * The fake records what it was asked and answers with `rows`, so no test
 * touches the shared Supabase database. Who gets which notice is tested
 * beside each action, in the project, proposal, quotation and job tests.
 *
 * Run: npm test (in apps/api).
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import type { Notification } from '@mangodb/shared';

const CALLER = 7;

let rows: unknown[] = [];
let findManyArgs: unknown = null;
let updateManyArgs: { where: unknown; data: { readAt: Date } } | null = null;

const fakePrisma = {
    notification: {
        findMany: async (args: unknown) => {
            findManyArgs = args;
            return rows;
        },
        updateMany: async (args: {
            where: unknown;
            data: { readAt: Date };
        }) => {
            updateManyArgs = args;
            return { count: 1 };
        },
    },
};

function moduleUrl(specifier: string): string {
    return pathToFileURL(require.resolve(specifier)).href;
}

let controller: typeof import('./notification.controller.js');

before(async () => {
    mock.module(moduleUrl('../lib/prisma'), {
        namedExports: { prisma: fakePrisma },
    });
    controller = await import('./notification.controller.js');
});

beforeEach(() => {
    rows = [];
    findManyArgs = null;
    updateManyArgs = null;
});

// Calls a handler as CALLER and records what it answered.
async function call(
    handler: (req: Request, res: Response) => Promise<void>,
): Promise<{ status: number; body: unknown }> {
    const req = { auth: { companyId: CALLER } } as unknown as Request;
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
        end() {
            return this;
        },
    } as unknown as Response;
    await handler(req, res);
    return { status, body };
}

function row(notificationId: number, projectId: number | null) {
    return {
        notificationId,
        notificationType: projectId ? 'QUOTATION_SENT' : 'PROPOSAL_RECEIVED',
        readAt: null,
        createdAt: new Date('2026-11-11T08:00:00.000Z'),
        sender: { companyId: 3, companyName: 'Acme', companyPhoto: null },
        proposal: {
            listing: {
                listingId: 10,
                listingType: 'JOB',
                listingTitle: 'Build a website',
            },
            project: projectId ? { projectId } : null,
        },
    };
}

describe('GET /notifications/mine', () => {
    it("asks for the caller's newest 20, the id breaking a tie", async () => {
        await call(controller.listMyNotifications);

        const args = findManyArgs as Record<string, unknown>;
        assert.deepEqual(args.where, { recipientId: CALLER });
        assert.deepEqual(args.orderBy, [
            { createdAt: 'desc' },
            { notificationId: 'desc' },
        ]);
        assert.equal(args.take, 20);
    });

    it('answers each notice with its listing, and its project once there is one', async () => {
        rows = [row(2, 15), row(1, null)];

        const { status, body } = await call(controller.listMyNotifications);

        assert.equal(status, 200);
        const notices = body as Notification[];
        assert.deepEqual(notices[0], {
            notificationId: 2,
            notificationType: 'QUOTATION_SENT',
            sender: { companyId: 3, companyName: 'Acme', companyPhoto: null },
            listingId: 10,
            listingType: 'JOB',
            listingTitle: 'Build a website',
            projectId: 15,
            readAt: null,
            createdAt: '2026-11-11T08:00:00.000Z',
        });
        assert.equal(notices[1]!.projectId, null);
    });
});

describe('POST /notifications/mine/read', () => {
    it("marks only the caller's unread notices read and answers 204", async () => {
        const startedAt = Date.now();

        const { status } = await call(controller.markMyNotificationsRead);

        assert.equal(status, 204);
        assert.deepEqual(updateManyArgs!.where, {
            recipientId: CALLER,
            readAt: null,
        });
        const readAt = updateManyArgs!.data.readAt.getTime();
        assert.ok(readAt >= startedAt && readAt <= Date.now());
    });
});
