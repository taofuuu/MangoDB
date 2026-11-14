/*
 * API tests for /auth (register, check-availability, login, admin login,
 * logout), /categories and /notifications/mine.
 *
 * Covers: register for each account type (which subtype rows it creates),
 * with and without the optional columns, a taken username, and the race where
 * the unique index fires after the check; the availability hint; both login
 * doors turning away the other kind of account; the session cookie; logout
 * revoking the token; and the bell list and mark-read.
 *
 * How: the real app on a random port (helpers/http); the database is the
 * Prisma fake, so each test sets the rows a route reads.
 */
import { describe, expect, it, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import { call, PROVIDER, useApi } from '../helpers/http';
import { db } from '../helpers/prisma-mock';
import { brief, companyRow } from '../helpers/rows';

useApi();
jest.setTimeout(30_000);

const register = {
    companyName: 'Alpha',
    username: 'Alpha_1',
    email: 'A@Mango.test',
    password: 'password-1',
    phone: '+66 81 234 5678',
    accountType: 'PROVIDER',
    companyType: ['Software'],
    tosAccepted: true,
};

describe('POST /auth/register', () => {
    it.each([
        ['PROVIDER', true, false],
        ['RECEIVER', false, true],
        ['BOTH', true, true],
    ])(
        'a %s gets its subtype rows and a session',
        async (accountType, provider, receiver) => {
            db.$queryRaw.mockResolvedValue([]);
            db.company.create.mockResolvedValue(companyRow({ accountType }));

            const res = await call('POST', '/auth/register', {
                body: { ...register, accountType },
            });

            expect(res.status).toBe(201);
            expect(res.body.accessToken).toEqual(expect.any(String));
            expect(res.headers.get('set-cookie')).toContain('access_token=');
            const data = db.company.create.mock.calls[0]![0].data;
            expect('provider' in data).toBe(provider);
            expect('receiver' in data).toBe(receiver);
            expect(data).toMatchObject({
                username: 'alpha_1',
                email: 'a@mango.test',
                phone: '0812345678',
                companyDescription: null,
                address: null,
                website: null,
            });
        },
    );

    it('keeps the optional columns when sent', async () => {
        db.$queryRaw.mockResolvedValue([]);
        db.company.create.mockResolvedValue(companyRow());

        await call('POST', '/auth/register', {
            body: {
                ...register,
                companyDescription: 'We build',
                address: 'Bangkok',
                website: 'https://alpha.test',
            },
        });

        expect(db.company.create.mock.calls[0]![0].data).toMatchObject({
            companyDescription: 'We build',
            address: 'Bangkok',
            website: 'https://alpha.test',
        });
    });

    it('no Terms consent, a bad URL or a bad phone is a 400 naming the field', async () => {
        const res = await call('POST', '/auth/register', {
            body: {
                ...register,
                tosAccepted: false,
                website: 'javascript:alert(1)',
                phone: '12',
            },
        });

        expect(res.status).toBe(400);
        expect(
            res.body.error.details.map((d: { field: string }) => d.field),
        ).toEqual(expect.arrayContaining(['tosAccepted', 'website', 'phone']));
    });

    it('a password over 72 bytes is refused', async () => {
        const res = await call('POST', '/auth/register', {
            body: { ...register, password: 'ก'.repeat(30) },
        });

        expect(res.body.error.details[0].message).toBe(
            'Password must be at most 72 bytes',
        );
    });

    it('a taken username is a 409 before any write', async () => {
        db.$queryRaw.mockResolvedValue([
            { username: 'alpha_1', email: 'x@y.test' },
        ]);

        const res = await call('POST', '/auth/register', { body: register });

        expect(res.status).toBe(409);
        expect(db.company.create).not.toHaveBeenCalled();
    });

    it('losing the race to the unique index is a 409 too', async () => {
        db.$queryRaw.mockResolvedValue([]);
        db.company.create.mockRejectedValue({ code: 'P2002' });

        const res = await call('POST', '/auth/register', { body: register });

        expect(res.status).toBe(409);
    });

    it('any other database error is a 500', async () => {
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        db.$queryRaw.mockResolvedValue([]);
        db.company.create.mockRejectedValue(new Error('down'));

        const res = await call('POST', '/auth/register', { body: register });

        expect(res.status).toBe(500);
        log.mockRestore();
    });
});

describe('POST /auth/check-availability', () => {
    it('answers for both fields', async () => {
        db.$queryRaw.mockResolvedValue([]);

        const res = await call('POST', '/auth/check-availability', {
            body: { username: 'beta', email: 'b@mango.test' },
        });

        expect(res.body).toEqual({
            username: 'beta',
            email: 'b@mango.test',
            usernameAvailable: true,
            emailAvailable: true,
        });
    });
});

describe('login', () => {
    async function account(accountType: string) {
        db.company.findUnique.mockResolvedValue({
            ...companyRow({ accountType }),
            password: await bcrypt.hash('password-1', 4),
            deletedAt: null,
        });
    }
    const body = { email: 'login1@mango.test', password: 'password-1' };

    it('a company signs in at /auth/login', async () => {
        await account('PROVIDER');

        const res = await call('POST', '/auth/login', { body });

        expect(res.status).toBe(200);
        expect(res.body.company.companyId).toBe(1);
    });

    it('an admin is sent to its own door', async () => {
        await account('ADMIN');

        const res = await call('POST', '/auth/login', {
            body: { ...body, email: 'login2@mango.test' },
        });

        expect(res.status).toBe(403);
        expect(res.body.error.message).toBe(
            'Administrators must use the administrator login',
        );
    });

    it('an admin signs in at /auth/admin/login; a company does not', async () => {
        await account('ADMIN');
        const admin = await call('POST', '/auth/admin/login', {
            body: { ...body, email: 'login3@mango.test' },
        });
        await account('BOTH');
        const company = await call('POST', '/auth/admin/login', {
            body: { ...body, email: 'login4@mango.test' },
        });

        expect(admin.status).toBe(200);
        expect(company.status).toBe(403);
        expect(company.body.error.message).toBe(
            'This is not an administrator account',
        );
    });

    it('ten failed tries for one email are then a 429', async () => {
        db.company.findUnique.mockResolvedValue(null);
        const wrong = { email: 'locked@mango.test', password: 'nope' };

        for (let i = 0; i < 10; i++) {
            await call('POST', '/auth/login', { body: wrong });
        }
        const res = await call('POST', '/auth/login', { body: wrong });

        expect(res.status).toBe(429);
        expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
    });
});

describe('POST /auth/logout', () => {
    it('revokes the token and clears the cookie', async () => {
        const res = await call('POST', '/auth/logout', { as: PROVIDER });

        expect(res.status).toBe(204);
        expect(db.revokedToken.upsert).toHaveBeenCalled();
        expect(res.headers.get('set-cookie')).toContain('access_token=;');
    });

    it('needs a session', async () => {
        const res = await call('POST', '/auth/logout');

        expect(res.status).toBe(401);
    });
});

describe('GET /categories', () => {
    it('lists the catalog', async () => {
        db.category.findMany.mockResolvedValue([
            { categoryId: 1, categoryName: 'Web' },
        ]);

        const res = await call('GET', '/categories');

        expect(res.body).toEqual([{ categoryId: 1, categoryName: 'Web' }]);
    });
});

describe('/notifications/mine', () => {
    it('lists the caller’s notices', async () => {
        db.notification.findMany.mockResolvedValue([
            {
                notificationId: 1,
                notificationType: 'PROPOSAL_REJECTED',
                readAt: null,
                createdAt: new Date('2026-01-01T00:00:00Z'),
                sender: brief(2),
                proposal: {
                    listing: {
                        listingId: 3,
                        listingType: 'JOB',
                        listingTitle: 'T',
                    },
                    project: null,
                },
            },
        ]);

        const res = await call('GET', '/notifications/mine', { as: PROVIDER });

        expect(res.body[0]).toMatchObject({ notificationId: 1, listingId: 3 });
        expect(db.notification.findMany.mock.calls[0]![0].where).toEqual({
            recipientId: PROVIDER.companyId,
        });
    });

    it('marks every unread notice read', async () => {
        const res = await call('POST', '/notifications/mine/read', {
            as: PROVIDER,
        });

        expect(res.status).toBe(204);
        expect(db.notification.updateMany).toHaveBeenCalled();
    });
});
