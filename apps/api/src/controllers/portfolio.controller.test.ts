/*
 * Tests for POST /portfolios (createPortfolio in portfolio.controller.ts).
 *
 * What they cover:
 * - The image is uploaded before the row is written. If the write fails, the
 *   uploaded image is removed again, so storage is not left holding a file no
 *   row points at. Every upload goes through saveWithUpload (lib/upload.ts),
 *   and lib/storage is the only thing mocked, so this runs the real helper.
 * - A saved row keeps its image.
 *
 * How:
 * - lib/prisma and lib/storage are replaced with mock.module before the
 *   controller loads, so nothing reaches the database or Supabase. The fake
 *   storage records which paths were uploaded and removed.
 *
 * Run: npm test (in apps/api). Needs --experimental-test-module-mocks, which the
 * test script passes.
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';

const OWNER = 1;
const UPLOADED = {
    path: 'portfolios/new.png',
    url: 'https://img.test/new.png',
};

let removed: string[] = [];
// What servicePortfolio.create does this test: save, or fail like the
// database would.
let createFails = false;

const fakePrisma = {
    // The ownership check: OWNER's open service.
    listing: {
        findUnique: async () => ({
            companyId: OWNER,
            listingType: 'SERVICE',
            listingStatus: 'OPEN',
            minBudget: null,
            maxBudget: null,
        }),
    },
    servicePortfolio: {
        create: async (args: {
            data: {
                portfolioName: string;
                portfolioDescription: string | null;
                developmentDate: Date;
                portfolioImage: string;
                portfolioLink: string;
            };
        }) => {
            if (createFails) throw new Error('database is down');
            return { ...args.data, portfolioId: 7, listingId: 25 };
        },
    },
};

const fakeStorage = {
    BUCKETS: {
        CERTIFICATE: 'certificate',
        PORTFOLIO: 'portfolio',
        PROFILE: 'profile',
    },
    uploadToStorage: async () => UPLOADED,
    removeFromStorage: async (path: string) => {
        removed.push(path);
    },
    removeFromStorageByUrl: async () => {},
};

function moduleUrl(specifier: string): string {
    return pathToFileURL(require.resolve(specifier)).href;
}

let controller: typeof import('./portfolio.controller.js');

before(async () => {
    mock.module(moduleUrl('../lib/prisma'), {
        namedExports: { prisma: fakePrisma },
    });
    mock.module(moduleUrl('../lib/storage'), { namedExports: fakeStorage });
    controller = await import('./portfolio.controller.js');
});

beforeEach(() => {
    removed = [];
    createFails = false;
});

// Sends a valid create as OWNER. Returns the status it answered with, or the
// error it threw.
async function create(): Promise<unknown> {
    const req = {
        auth: { companyId: OWNER },
        file: { originalname: 'new.png', mimetype: 'image/png' },
        body: {
            serviceId: '25',
            portfolioName: 'Shop redesign',
            developmentDate: '2026-01-15',
            portfolioLink: 'https://example.test/shop',
        },
    } as unknown as Request;
    let status = 200;
    const res = {
        status(code: number) {
            status = code;
            return this;
        },
        json() {
            return this;
        },
    } as unknown as Response;

    try {
        await controller.createPortfolio(req, res);
    } catch (err) {
        return err;
    }
    return status;
}

describe('POST /portfolios', () => {
    it('removes the uploaded image when the row cannot be saved', async () => {
        createFails = true;

        const result = await create();

        assert.ok(result instanceof Error, 'expected the database error');
        assert.equal(result.message, 'database is down');
        assert.deepEqual(removed, [UPLOADED.path]);
    });

    it('keeps the image when the row is saved', async () => {
        const result = await create();

        assert.equal(result, 201);
        assert.deepEqual(removed, []);
    });
});
