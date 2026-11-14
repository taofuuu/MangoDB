/*
 * Tests for DELETE /companies/me (deleteMyAccount, US1-6).
 *
 * What they cover:
 * - The company's own password is required: missing is 400, wrong is 401,
 *   and neither soft-deletes anything.
 * - The right password soft-deletes the company and answers 204.
 *
 * How:
 * - lib/prisma, lib/storage and lib/session are replaced with mock.module
 *   before the controller loads, so nothing reaches the database.
 *
 * Run: npm test (in apps/api).
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { ApiError } from '../lib/api-error';

const COMPANY_ID = 5;
const PASSWORD = 'correct-horse';

let storedHash: string;
let softDeletes: number;

// softDeleteCompany's own writes (pending proposals, notices) are covered in
// lib/company-deletion.test.ts; here they only need to answer.
const fakePrisma = {
    $transaction: (work: (tx: unknown) => Promise<unknown>) => work(fakePrisma),
    proposal: {
        updateMany: () => Promise.resolve({ count: 0 }),
        updateManyAndReturn: () => Promise.resolve([]),
    },
    notification: {
        createMany: () => Promise.resolve({ count: 0 }),
    },
    company: {
        findUnique: () => Promise.resolve({ password: storedHash }),
        updateMany: () => {
            softDeletes += 1;
            return Promise.resolve({ count: 1 });
        },
    },
    project: {
        findFirst: () => Promise.resolve(null),
    },
};

function moduleUrl(specifier: string): string {
    return pathToFileURL(require.resolve(specifier)).href;
}

let controller: typeof import('./company.controller.js');

before(async () => {
    // Low cost: compare reads the cost from the hash, and 4 keeps tests fast.
    storedHash = await bcrypt.hash(PASSWORD, 4);
    mock.module(moduleUrl('../lib/prisma'), {
        namedExports: { prisma: fakePrisma },
    });
    // Both load env.ts, which throws without a JWT_SECRET.
    mock.module(moduleUrl('../lib/storage'), {
        namedExports: {
            BUCKETS: { PROFILE: 'profile' },
            removeFromStorageByUrl: async () => undefined,
        },
    });
    mock.module(moduleUrl('../lib/session'), {
        namedExports: { sendSession: () => undefined },
    });
    controller = await import('./company.controller.js');
});

beforeEach(() => {
    softDeletes = 0;
});

async function deleteMe(body: unknown): Promise<number | ApiError> {
    const req = {
        body,
        auth: { companyId: COMPANY_ID, role: 'provider' },
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
        await controller.deleteMyAccount(req, res);
    } catch (err) {
        assert.ok(err instanceof ApiError);
        return err;
    }
    return status;
}

describe('DELETE /companies/me', () => {
    it('is 400 without a password, and deletes nothing', async () => {
        const result = await deleteMe({});
        assert.ok(result instanceof ApiError);
        assert.equal(result.status, 400);
        assert.equal(softDeletes, 0);
    });

    it('is 401 with a wrong password, and deletes nothing', async () => {
        const result = await deleteMe({ currentPassword: 'wrong-password' });
        assert.ok(result instanceof ApiError);
        assert.equal(result.status, 401);
        assert.equal(softDeletes, 0);
    });

    it('soft-deletes with the right password', async () => {
        const result = await deleteMe({ currentPassword: PASSWORD });
        assert.equal(result, 204);
        assert.equal(softDeletes, 1);
    });
});
