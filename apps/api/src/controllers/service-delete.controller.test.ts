/*
 * Tests for DELETE /services/:serviceId (deleteService, US2-4 and #264).
 *
 * What they cover:
 * - A service with a pending hire request is 409 and deletes nothing (#264).
 *   Deleting the listing cascades to its proposals and their notices, so the
 *   Receivers would lose their requests with no notice. The Provider must
 *   reject them first, which sends the usual notice.
 * - A service with a project is still 409 (US2-4).
 * - A service whose hire requests are all answered (rejected) is deleted: 204.
 *
 * How:
 * - lib/prisma and lib/storage are replaced with mock.module before the
 *   controller loads, so nothing reaches the shared database. The fake answers
 *   proposal.count by reading the status in the `where`, so the test checks
 *   which requests block the delete, not which query ran.
 *
 * Run: npm test (in apps/api).
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import { ApiError } from '../lib/api-error';

const OWNER = 5;
const SERVICE_ID = 40;

let proposalStatuses: string[];
let projectCount: number;
let deletes: number;

type CountArgs = { where: { listingId: number; proposalStatus?: string } };

const fakePrisma = {
    listing: {
        findUnique: () =>
            Promise.resolve({
                companyId: OWNER,
                listingType: 'SERVICE',
                listingStatus: 'OPEN',
                minBudget: null,
                maxBudget: null,
            }),
        delete: () => {
            deletes += 1;
            return Promise.resolve({});
        },
    },
    project: {
        count: () => Promise.resolve(projectCount),
    },
    proposal: {
        count: ({ where }: CountArgs) =>
            Promise.resolve(
                proposalStatuses.filter(
                    (s) =>
                        where.proposalStatus === undefined ||
                        s === where.proposalStatus,
                ).length,
            ),
    },
    servicePortfolio: {
        findMany: () => Promise.resolve([]),
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
    // Loads env.ts, which throws without a JWT_SECRET.
    mock.module(moduleUrl('../lib/storage'), {
        namedExports: {
            BUCKETS: { PORTFOLIO: 'portfolio' },
            removeFromStorageByUrl: async () => undefined,
        },
    });
    controller = await import('./service.controller.js');
});

beforeEach(() => {
    proposalStatuses = [];
    projectCount = 0;
    deletes = 0;
});

async function deleteService(): Promise<number | ApiError> {
    const req = {
        params: { serviceId: String(SERVICE_ID) },
        auth: { companyId: OWNER, role: 'provider' },
    } as unknown as Request;

    let status = 200;
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
        assert.ok(err instanceof ApiError);
        return err;
    }
    return status;
}

describe('DELETE /services/:serviceId', () => {
    it('is 409 with a pending hire request, and deletes nothing', async () => {
        proposalStatuses = ['REJECTED', 'PENDING'];

        const result = await deleteService();

        assert.ok(result instanceof ApiError);
        assert.equal(result.status, 409);
        assert.equal(deletes, 0);
    });

    it('is 409 with a project, and deletes nothing', async () => {
        projectCount = 1;

        const result = await deleteService();

        assert.ok(result instanceof ApiError);
        assert.equal(result.status, 409);
        assert.equal(deletes, 0);
    });

    it('deletes a service whose hire requests are all rejected', async () => {
        proposalStatuses = ['REJECTED', 'REJECTED'];

        const result = await deleteService();

        assert.equal(result, 204);
        assert.equal(deletes, 1);
    });
});
