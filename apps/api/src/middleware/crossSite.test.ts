/*
 * Tests for refuseCrossSiteWrites (middleware/crossSite.ts), the CSRF check.
 *
 * What they cover:
 * - A write the browser marks cross-site is a 403.
 * - Reads, same-origin and same-site writes, and requests with no
 *   Sec-Fetch-Site header (curl, Postman) pass.
 *
 * Run: npm test (in apps/api).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { ApiError } from '../lib/api-error';
import { refuseCrossSiteWrites } from './crossSite';

function run(method: string, secFetchSite?: string): unknown {
    const req = {
        method,
        get: (name: string) =>
            name.toLowerCase() === 'sec-fetch-site' ? secFetchSite : undefined,
    } as unknown as Request;

    let passed: unknown = 'not called';
    refuseCrossSiteWrites(req, {} as Response, (err?: unknown) => {
        passed = err;
    });
    return passed;
}

describe('refuseCrossSiteWrites', () => {
    it('refuses a cross-site write with 403', () => {
        for (const method of ['POST', 'PATCH', 'DELETE']) {
            const err = run(method, 'cross-site');
            assert.ok(err instanceof ApiError);
            assert.equal(err.status, 403);
        }
    });

    it('lets a cross-site read through', () => {
        assert.equal(run('GET', 'cross-site'), undefined);
    });

    it('lets same-origin, same-site and header-less writes through', () => {
        assert.equal(run('POST', 'same-origin'), undefined);
        assert.equal(run('POST', 'same-site'), undefined);
        assert.equal(run('POST', 'none'), undefined);
        assert.equal(run('POST'), undefined);
    });
});
