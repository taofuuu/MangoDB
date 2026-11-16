/*
 * API tests for what every request passes through in app.ts: health and docs,
 * the no-store header, the 404 envelope for an unknown path, body-parser
 * errors (bad JSON, too large), the cross-site write guard, and the error
 * handler's 500 for an unplanned error.
 *
 * How: the real app on a random port (helpers/http). The database is a fake.
 */
import { describe, expect, it, jest } from '@jest/globals';
import { call, useApi } from './helpers/http';
import { db } from './helpers/prisma-mock';

useApi();

describe('app', () => {
    it('GET /health answers ok without naming Express', async () => {
        const res = await call('GET', '/health');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok' });
        expect(res.headers.get('x-powered-by')).toBeNull();
    });

    it('an API answer is never cached', async () => {
        db.category.findMany.mockResolvedValue([]);

        const res = await call('GET', '/categories');

        expect(res.status).toBe(200);
        expect(res.headers.get('cache-control')).toBe('no-store');
    });

    it('GET /openapi.json serves the spec', async () => {
        const res = await call('GET', '/openapi.json');

        expect(res.status).toBe(200);
        expect(res.body.openapi).toMatch(/^3\./);
    });

    it('an unknown path gets the 404 envelope', async () => {
        const res = await call('GET', '/nope');

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: { code: 'NOT_FOUND', message: 'Cannot GET /nope' },
        });
    });

    it('broken JSON is a 400, not a 500', async () => {
        const res = await call('POST', '/auth/login', { body: '{"email":' });

        expect(res.status).toBe(400);
        expect(res.body.error.message).toBe('Request body is not valid JSON');
    });

    it('a body over the limit is a 400', async () => {
        const res = await call('POST', '/auth/login', {
            body: JSON.stringify({ email: 'x'.repeat(200_000) }),
        });

        expect(res.status).toBe(400);
        expect(res.body.error.message).toBe('Request body is too large');
    });

    it('a cross-site write is refused', async () => {
        const res = await call('POST', '/auth/logout', {
            headers: { 'sec-fetch-site': 'cross-site' },
        });

        expect(res.status).toBe(403);
        expect(res.body.error.message).toBe(
            'Cross-site requests are not allowed',
        );
    });

    it('a cross-site read passes the guard', async () => {
        const res = await call('GET', '/health', {
            headers: { 'sec-fetch-site': 'cross-site' },
        });

        expect(res.status).toBe(200);
    });

    it('an unplanned error is a 500 that leaks nothing', async () => {
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        db.category.findMany.mockRejectedValue(new Error('db down'));

        const res = await call('GET', '/categories');

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: { code: 'INTERNAL', message: 'Internal server error' },
        });
        log.mockRestore();
    });
});
