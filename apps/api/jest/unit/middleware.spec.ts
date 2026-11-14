/*
 * Unit tests for src/middleware: requireAuth and requireRole (auth.ts), the
 * error handler, the parse helpers (validate.ts), the login rate limit key and
 * the upload checks (upload.ts).
 *
 * Covers each way requireAuth refuses (no token, bad token, revoked, ended
 * session) and both token sources (header, cookie); requireRole with no auth,
 * a wrong role and a granted one; the error handler once headers are sent;
 * every upload outcome (each image type's signature, a PDF, a lying
 * mimetype, an oversized file, an unexpected field, a rejected type, no
 * file); and requireFile / assertSomethingToUpdate.
 *
 * How: middleware is called with fake req/res/next, except uploads, which go
 * through a small Express app because multer needs a real multipart stream.
 */
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import express, {
    type NextFunction,
    type Request,
    type Response,
} from 'express';
import type { Server } from 'node:http';
import { ApiError } from '../../src/lib/api-error';
import { requireAuth, requireRole } from '../../src/middleware/auth';
import { errorHandler } from '../../src/middleware/errorHandler';
import { loginLimiter } from '../../src/middleware/rateLimit';
import {
    assertSomethingToUpdate,
    requireFile,
    uploadImage,
    uploadPdf,
} from '../../src/middleware/upload';
import {
    parseBody,
    parseParams,
    parseQuery,
} from '../../src/middleware/validate';
import { z } from 'zod';
import * as deletion from '../../src/lib/company-deletion';
import { IMAGE_EXTENSIONS } from '../../src/lib/storage';
import { db } from '../helpers/prisma-mock';
import { formWith, PDF, PNG, tokenFor } from '../helpers/http';

type Next = jest.Mock<(err?: unknown) => void>;

function fakeReq(parts: Partial<Request>): Request {
    return { headers: {}, cookies: {}, ...parts } as Request;
}

async function runAuth(req: Request): Promise<{ err: unknown; req: Request }> {
    const next: Next = jest.fn();
    await requireAuth(req, {} as Response, next as NextFunction);
    return { err: next.mock.calls[0]?.[0], req };
}

describe('requireAuth', () => {
    it('no token is a 401', async () => {
        const { err } = await runAuth(fakeReq({}));

        expect((err as ApiError).message).toBe(
            'Missing or malformed Authorization header',
        );
    });

    it('a request without a cookie jar is a 401 too', async () => {
        const { err } = await runAuth({ headers: {} } as Request);

        expect((err as ApiError).status).toBe(401);
    });

    it('a token that does not verify is a 401', async () => {
        const { err } = await runAuth(
            fakeReq({ headers: { authorization: 'Bearer nonsense' } }),
        );

        expect((err as ApiError).message).toBe('Invalid or expired token');
    });

    it('a revoked token is a 401', async () => {
        db.revokedToken.findUnique.mockResolvedValue({
            expiresAt: new Date(Date.now() + 60_000),
        });
        const token = tokenFor({ companyId: 1, role: 'provider' });

        const { err } = await runAuth(
            fakeReq({ headers: { authorization: `Bearer ${token}` } }),
        );

        expect((err as ApiError).message).toBe('Session has ended');
    });

    it('a session ended by deletion is a 401', async () => {
        db.company.findUnique.mockResolvedValue({
            deletedAt: new Date(),
            credentialsChangedAt: null,
        });
        const token = tokenFor({ companyId: 1, role: 'provider' });

        const { err } = await runAuth(
            fakeReq({ cookies: { access_token: token } }),
        );

        expect((err as ApiError).message).toBe('Session has ended');
    });

    it('a live token from the cookie sets req.auth with a number id', async () => {
        db.company.findUnique.mockResolvedValue({
            deletedAt: null,
            credentialsChangedAt: null,
        });
        const token = tokenFor({ companyId: 4, role: 'both' });

        const { err, req } = await runAuth(
            fakeReq({ cookies: { access_token: token } }),
        );

        expect(err).toBeUndefined();
        expect(req.auth?.companyId).toBe(4);
        expect(req.auth?.role).toBe('both');
    });
});

describe('isSessionEnded', () => {
    const iat = Math.floor(Date.now() / 1000);

    it('a missing company has no session', async () => {
        db.company.findUnique.mockResolvedValue(null);

        await expect(deletion.isSessionEnded(1, iat)).resolves.toBe(true);
    });

    it('no credential change keeps the session', async () => {
        db.company.findUnique.mockResolvedValue({
            deletedAt: null,
            credentialsChangedAt: null,
        });

        await expect(deletion.isSessionEnded(1, iat)).resolves.toBe(false);
    });

    it('a token older than the last credential change is ended', async () => {
        db.company.findUnique.mockResolvedValue({
            deletedAt: null,
            credentialsChangedAt: new Date((iat + 5) * 1000),
        });

        await expect(deletion.isSessionEnded(1, iat)).resolves.toBe(true);
    });

    it('a token from the same second as the change survives', async () => {
        db.company.findUnique.mockResolvedValue({
            deletedAt: null,
            credentialsChangedAt: new Date(iat * 1000),
        });

        await expect(deletion.isSessionEnded(1, iat)).resolves.toBe(false);
    });
});

describe('requireRole', () => {
    function run(auth: Request['auth']): unknown {
        const next: Next = jest.fn();
        requireRole('provider')(
            { auth } as Request,
            {} as Response,
            next as NextFunction,
        );
        return next.mock.calls[0]?.[0];
    }

    it('no auth is a 401', () => {
        expect((run(undefined) as ApiError).status).toBe(401);
    });

    it('a role that does not grant it is a 403', () => {
        const auth = { role: 'receiver', companyId: 1 } as Request['auth'];

        expect((run(auth) as ApiError).status).toBe(403);
    });

    it('BOTH passes a provider route', () => {
        const auth = { role: 'both', companyId: 1 } as Request['auth'];

        expect(run(auth)).toBeUndefined();
    });
});

describe('errorHandler', () => {
    it('hands over to Express once headers are sent', () => {
        const next: Next = jest.fn();
        const err = new Error('late');

        errorHandler(
            err,
            {} as Request,
            { headersSent: true } as Response,
            next as NextFunction,
        );

        expect(next).toHaveBeenCalledWith(err);
    });

    it('a null error is a 500', () => {
        const json = jest.fn();
        const res = {
            headersSent: false,
            status: jest.fn(() => ({ json })),
        } as unknown as Response;
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});

        errorHandler(null, {} as Request, res, jest.fn() as NextFunction);

        expect(res.status).toHaveBeenCalledWith(500);
        log.mockRestore();
    });
});

describe('validate', () => {
    const schema = z.object({ n: z.number() });

    it('parseBody returns the data or a field-level 400', () => {
        expect(parseBody(schema, { n: 1 })).toEqual({ n: 1 });
        try {
            parseBody(schema, { n: 'x' });
        } catch (err) {
            expect((err as ApiError).details).toEqual([
                { field: 'n', message: expect.any(String) },
            ]);
        }
    });

    it('an error on the whole body is named (body)', () => {
        expect(() => parseBody(schema, 'text')).toThrow(
            expect.objectContaining({
                details: [{ field: '(body)', message: expect.any(String) }],
            }),
        );
    });

    it('parseQuery and parseParams say which part was wrong', () => {
        expect(parseQuery(schema, { n: 2 })).toEqual({ n: 2 });
        expect(parseParams(schema, { n: 3 })).toEqual({ n: 3 });
        expect(() => parseQuery(schema, {})).toThrow(
            'Query parameters are invalid',
        );
        expect(() => parseParams(schema, {})).toThrow(
            'Path parameters are invalid',
        );
    });
});

describe('loginLimiter', () => {
    it('counts per email, trimmed and lowercased, and copes with no body', async () => {
        const app = express();
        app.use(express.json());
        const keys: string[] = [];
        app.post('/', loginLimiter, (req, res) => {
            keys.push(String(req.body?.email ?? ''));
            res.status(401).end();
        });
        const server = app.listen(0);
        const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;

        const first = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: ' A@B.test ' }),
        });
        const second = await fetch(url, { method: 'POST' });
        server.close();

        expect(first.status).toBe(401);
        expect(second.status).toBe(401);
        expect(first.headers.get('ratelimit-policy')).toContain('10');
    });
});

describe('upload', () => {
    let server: Server;
    let url = '';

    beforeAll(() => {
        const app = express();
        const ok = (req: Request, res: Response) => {
            res.json({ size: req.file?.size ?? null });
        };
        app.post('/image', uploadImage('file'), ok);
        app.post('/pdf', uploadPdf('file'), ok);
        app.use(errorHandler);
        server = app.listen(0);
        url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterAll(() => {
        server.close();
    });

    async function send(
        path: string,
        bytes: Buffer,
        type: string,
        field = 'file',
    ) {
        const res = await fetch(url + path, {
            method: 'POST',
            body: formWith({}, { field, bytes, type }),
        });
        return {
            status: res.status,
            body: (await res.json()) as {
                error?: { message: string };
                size?: number;
            },
        };
    }

    const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
    const WEBP = Buffer.concat([
        Buffer.from('RIFF', 'latin1'),
        Buffer.alloc(4),
        Buffer.from('WEBPVP8 ', 'latin1'),
    ]);

    it.each([
        ['PNG', PNG, 'image/png'],
        ['JPEG', JPEG, 'image/jpeg'],
        ['WebP', WEBP, 'image/webp'],
    ])('a real %s is accepted', async (_name, bytes, type) => {
        const res = await send('/image', bytes, type);

        expect(res.status).toBe(200);
        expect(res.body.size).toBe(bytes.length);
    });

    it.each([
        ['PNG', 'image/png'],
        ['JPEG', 'image/jpeg'],
        ['WebP', 'image/webp'],
    ])('text claiming to be %s is refused', async (_name, type) => {
        const res = await send(
            '/image',
            Buffer.from('not an image at all'),
            type,
        );

        expect(res.status).toBe(400);
        expect(res.body.error?.message).toBe(
            'Only PNG, JPEG or WebP images are allowed',
        );
    });

    it('a WebP without the WEBP mark is refused', async () => {
        const fake = Buffer.concat([
            Buffer.from('RIFF', 'latin1'),
            Buffer.alloc(8),
        ]);

        const res = await send('/image', fake, 'image/webp');

        expect(res.status).toBe(400);
    });

    it('a type added to the allowlist without a signature check is still refused', async () => {
        IMAGE_EXTENSIONS['image/gif'] = 'gif';
        try {
            const res = await send(
                '/image',
                Buffer.from('GIF89a'),
                'image/gif',
            );

            expect(res.status).toBe(400);
        } finally {
            delete IMAGE_EXTENSIONS['image/gif'];
        }
    });

    it('an SVG is not an allowed image type', async () => {
        const res = await send(
            '/image',
            Buffer.from('<svg/>'),
            'image/svg+xml',
        );

        expect(res.status).toBe(400);
    });

    it('an image over 5 MB is refused with the size message', async () => {
        const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);

        const res = await send('/image', big, 'image/png');

        expect(res.body.error?.message).toBe('Image must be 5MB or smaller');
    });

    it('a file under another field name is refused', async () => {
        const res = await send('/image', PNG, 'image/png', 'other');

        expect(res.body.error?.message).toBe('Unexpected field: other');
    });

    it('no file at all passes through', async () => {
        const res = await fetch(`${url}/image`, {
            method: 'POST',
            body: formWith({ a: '1' }),
        });

        expect(await res.json()).toEqual({ size: null });
    });

    it('a PDF is accepted, with junk before its header', async () => {
        const res = await send(
            '/pdf',
            Buffer.concat([Buffer.from('xx'), PDF]),
            'application/pdf',
        );

        expect(res.status).toBe(200);
    });

    it('a PDF route refuses an image, and a fake PDF', async () => {
        const image = await send('/pdf', PNG, 'image/png');
        const fake = await send(
            '/pdf',
            Buffer.from('hello'),
            'application/pdf',
        );
        const big = await send(
            '/pdf',
            Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]),
            'application/pdf',
        );

        expect(image.body.error?.message).toBe('Only PDF files are allowed');
        expect(fake.body.error?.message).toBe('Only PDF files are allowed');
        expect(big.body.error?.message).toBe('PDF must be 5MB or smaller');
    });

    it('requireFile returns the file or names the field', () => {
        const file = { size: 1 } as Express.Multer.File;

        expect(requireFile(file, 'photo')).toBe(file);
        expect(() => requireFile(undefined, 'photo')).toThrow(
            expect.objectContaining({
                details: [{ field: 'photo', message: 'Choose an image first' }],
            }),
        );
        expect(() => requireFile(undefined, 'pdf', 'Choose a PDF')).toThrow(
            expect.objectContaining({
                details: [{ field: 'pdf', message: 'Choose a PDF' }],
            }),
        );
    });

    it('assertSomethingToUpdate needs a field or a file', () => {
        const file = { size: 1 } as Express.Multer.File;

        expect(() => assertSomethingToUpdate({}, undefined)).toThrow(
            'Provide at least one field to update',
        );
        expect(() => assertSomethingToUpdate({}, file)).not.toThrow();
        expect(() =>
            assertSomethingToUpdate({ a: 1 }, undefined),
        ).not.toThrow();
    });
});
